import { BOT_CONFIG } from "#config/index";
import { GroupModel } from "#lib/database/index";
import {
	GROUP_EVENT_PAYLOAD_KEY,
	addGroupEvent,
	deleteGroupEvent,
	findGroupEvent,
	formatGroupEventDetail,
	formatGroupEventHelp,
	formatGroupEventList,
	formatGroupEventReminder,
	getDueGroupEventReminders,
	getGroupPayloads,
	getUpcomingGroupEvents,
	markGroupEventNotified,
	normalizeGroupEventPayload,
	parseGroupEventInput,
	toWhatsAppEventPayload,
} from "#lib/groupCommunity";
import print from "#lib/print";

const EVENT_INTERVAL_MS = 60 * 1000;
const SEND_DELAY_MS = 1200;
const DEFAULT_PREFIX =
	process.env.AETHERIA_GROUP_PREFIX ||
	(BOT_CONFIG.prefixes.includes(".")
		? "."
		: BOT_CONFIG.prefixes.find((prefix) => prefix !== "/")) ||
	".";

let isRunning = false;

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMutatingAction(action) {
	return [
		"add",
		"buat",
		"new",
		"delete",
		"del",
		"hapus",
		"remove",
		"native",
	].includes(action);
}

async function saveEventPayload(groupId, group, payload) {
	await GroupModel.setGroup(groupId, {
		name: group?.name || group?.subject || "",
		payloads: {
			...getGroupPayloads(group),
			[GROUP_EVENT_PAYLOAD_KEY]: normalizeGroupEventPayload(payload),
		},
	});
}

async function sendNativeEvent(sock, groupId, event, quoted = null) {
	try {
		await sock.sendMessage(groupId, toWhatsAppEventPayload(event), {
			quoted,
		});
		return true;
	} catch (error) {
		print.error(
			`[GroupEvent] Failed sending native event to ${groupId}:`,
			error
		);
		return false;
	}
}

async function getAllGroups() {
	if (typeof GroupModel.getAllGroups === "function") {
		return GroupModel.getAllGroups();
	}

	return [];
}

async function runEventTick(sock) {
	if (!sock || isRunning) {
		return;
	}

	isRunning = true;

	try {
		const groups = await getAllGroups();
		const now = new Date();

		for (const group of groups) {
			const groupId = group?._id || group?.id || "";

			if (!groupId.endsWith("@g.us") || group.banned) {
				continue;
			}

			const payloads = getGroupPayloads(group);
			const payload = normalizeGroupEventPayload(
				payloads[GROUP_EVENT_PAYLOAD_KEY]
			);
			const due = getDueGroupEventReminders(payload, now);

			if (!due.length) {
				continue;
			}

			const reminder = due[0];

			try {
				await sock.sendMessage(groupId, {
					text: formatGroupEventReminder(
						reminder.event,
						reminder.minute,
						DEFAULT_PREFIX
					),
				});
				await saveEventPayload(
					groupId,
					group,
					markGroupEventNotified(
						payload,
						reminder.event.id,
						reminder.minute
					)
				);
				print.debug(
					`🗓️ [GroupEvent] Sent ${reminder.minute}m reminder to ${groupId}`
				);
				await delay(SEND_DELAY_MS);
			} catch (error) {
				print.error(
					`[GroupEvent] Failed sending to ${groupId}:`,
					error
				);
			}
		}
	} finally {
		isRunning = false;
	}
}

export default {
	name: "group-event",
	description: "Buat agenda grup dengan native event message dan reminder.",
	command: ["event", "agenda", "jadwal"],
	permissions: "all",
	category: "group",
	cooldown: 5,
	group: true,
	usage: "$prefix$command [add|list|native|delete|id]",
	wait: null,
	react: true,
	periodic: {
		enabled: true,
		type: "interval",
		interval: EVENT_INTERVAL_MS,
		run: async function (_, { sock }) {
			await runEventTick(sock);
		},
	},

	async execute(m, { command, isAdmin, isOwner, sock }) {
		const group = await GroupModel.getGroup(m.from);
		const payload = normalizeGroupEventPayload(
			getGroupPayloads(group)[GROUP_EVENT_PAYLOAD_KEY]
		);
		const action = String(m.args[0] || "list")
			.toLowerCase()
			.trim();

		if (isMutatingAction(action) && !isAdmin && !isOwner) {
			await m.reply("Agenda grup hanya bisa diubah admin grup.");
			return;
		}

		if (["help", "bantuan", "format"].includes(action)) {
			await m.reply(formatGroupEventHelp(m.prefix, command));
			return;
		}

		if (["list", "status", "upcoming"].includes(action)) {
			await m.reply(
				formatGroupEventList(getUpcomingGroupEvents(payload), m.prefix)
			);
			return;
		}

		if (["add", "buat", "new"].includes(action)) {
			const parsed = parseGroupEventInput(m.args.slice(1).join(" "));

			if (parsed.status !== "ok") {
				const messages = {
					invalid_date:
						"Format tanggal salah. Contoh: `besok 20:00` atau `2026-06-13 20:00`.",
					invalid_format: `Format: ${m.prefix}${command} add Judul | besok 20:00 | deskripsi | lokasi | 60`,
					invalid_title: "Judul agenda tidak valid.",
					past_date: "Waktu agenda harus lebih baru dari sekarang.",
				};

				await m.reply(
					messages[parsed.status] || messages.invalid_format
				);
				return;
			}

			const result = addGroupEvent(payload, {
				...parsed.event,
				createdByJid: m.senderPn || m.sender,
				createdByName: m.pushName,
			});

			if (result.status !== "ok") {
				await m.reply("Gagal menyimpan agenda.");
				return;
			}

			await saveEventPayload(m.from, group, result.payload);
			const nativeSent = await sendNativeEvent(
				sock,
				m.from,
				result.event,
				m
			);

			await m.reply(
				[
					nativeSent
						? "✅ Agenda tersimpan dan event card dikirim."
						: "✅ Agenda tersimpan. Event card gagal dikirim, fallback detail dipakai.",
					"",
					formatGroupEventDetail(result.event, m.prefix),
				].join("\n")
			);
			return;
		}

		if (["delete", "del", "hapus", "remove"].includes(action)) {
			const result = deleteGroupEvent(payload, m.args[1]);

			if (result.status !== "ok") {
				await m.reply("Agenda tidak ditemukan.");
				return;
			}

			await saveEventPayload(m.from, group, result.payload);
			await m.reply("✅ Agenda dihapus.");
			return;
		}

		if (["native", "card"].includes(action)) {
			const event = findGroupEvent(payload, m.args[1]);

			if (!event) {
				await m.reply("Agenda tidak ditemukan.");
				return;
			}

			const nativeSent = await sendNativeEvent(sock, m.from, event, m);
			await m.reply(
				nativeSent
					? "✅ Event card dikirim."
					: formatGroupEventDetail(event, m.prefix)
			);
			return;
		}

		if (["test", "tes", "reminder"].includes(action)) {
			const event = findGroupEvent(payload, m.args[1]);

			if (!event) {
				await m.reply("Agenda tidak ditemukan.");
				return;
			}

			await m.reply(formatGroupEventReminder(event, 15, m.prefix));
			return;
		}

		if (/^\d+$/.test(action)) {
			await m.reply(
				formatGroupEventDetail(
					findGroupEvent(payload, action),
					m.prefix
				)
			);
			return;
		}

		await m.reply(formatGroupEventHelp(m.prefix, command));
	},
};
