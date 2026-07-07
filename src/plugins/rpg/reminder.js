import { BOT_CONFIG } from "#config/index";
import { GroupModel, SettingsModel } from "#lib/database/index";
import print from "#lib/print";
import {
	DEFAULT_REMINDER_SLOTS,
	REMINDER_PAYLOAD_KEY,
	formatReminderMessage,
	formatReminderStatus,
	getDueReminderSlots,
	getReminderSlot,
	markReminderSent,
	normalizeReminderConfig,
	resetReminderConfig,
	setReminderSlotTime,
} from "#lib/reminder";

const REMINDER_INTERVAL_MS = 60 * 1000;
const SEND_DELAY_MS = 1500;
const DEFAULT_PREFIX =
	process.env.AETHERIA_REMINDER_PREFIX ||
	(BOT_CONFIG.prefixes.includes(".")
		? "."
		: BOT_CONFIG.prefixes.find((prefix) => prefix !== "/")) ||
	".";

let isRunning = false;

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGroupId(group) {
	return group?._id || group?.id || group?.jid || "";
}

function getGroupPayloads(group) {
	return group?.payloads && typeof group.payloads === "object"
		? group.payloads
		: {};
}

function getReminderPayload(group) {
	return normalizeReminderConfig(
		getGroupPayloads(group)[REMINDER_PAYLOAD_KEY]
	);
}

async function saveReminderPayload(groupId, group, config) {
	await GroupModel.setGroup(groupId, {
		name: group?.name || group?.subject || "",
		payloads: {
			...getGroupPayloads(group),
			[REMINDER_PAYLOAD_KEY]: normalizeReminderConfig(config),
		},
	});
}

async function getAllGroups() {
	if (typeof GroupModel.getAllGroups === "function") {
		return GroupModel.getAllGroups();
	}

	return [];
}

function isGlobalReminderDisabled(settings = {}) {
	return (
		process.env.AETHERIA_REMINDER_ENABLED === "false" ||
		settings.reminder === false
	);
}

async function runReminderTick(sock) {
	if (!sock || isRunning) {
		return;
	}

	isRunning = true;

	try {
		const settings = await SettingsModel.getSettings();

		if (isGlobalReminderDisabled(settings)) {
			return;
		}

		const groups = await getAllGroups();
		const now = new Date();

		for (const group of groups) {
			const groupId = getGroupId(group);

			if (!groupId.endsWith("@g.us") || group.banned) {
				continue;
			}

			const config = getReminderPayload(group);
			const dueSlots = getDueReminderSlots(config, now);

			if (!dueSlots.length) {
				continue;
			}

			const slot = dueSlots[0];

			try {
				await sock.sendMessage(groupId, {
					text: formatReminderMessage(slot, DEFAULT_PREFIX),
				});
				await saveReminderPayload(
					groupId,
					group,
					markReminderSent(config, slot.key, slot.dayKey)
				);
				print.debug(
					`⏰ [Reminder] Sent ${slot.key} reminder to ${groupId}`
				);
				await delay(SEND_DELAY_MS);
			} catch (error) {
				print.error(
					`[Reminder] Failed sending reminder to ${groupId}:`,
					error
				);
			}
		}
	} finally {
		isRunning = false;
	}
}

export default {
	name: "reminder",
	description: "Atur reminder otomatis grup Aetheria.",
	command: ["reminder", "remind", "pengingat"],
	permissions: "admin",
	category: "petualangan",
	cooldown: 5,
	group: true,
	wait: null,
	usage: [
		"$prefix$command",
		"$prefix$command on",
		"$prefix$command off",
		"$prefix$command jam <pagi|malam> <HH:mm>",
		"$prefix$command test <pagi|malam>",
		"$prefix$command reset",
	],
	periodic: {
		enabled: true,
		type: "interval",
		interval: REMINDER_INTERVAL_MS,
		run: async function (_, { sock }) {
			await runReminderTick(sock);
		},
	},

	async execute(m, { groupMetadata }) {
		const group = await GroupModel.getGroup(m.from);
		const config = getReminderPayload(group);
		const action = String(m.args[0] || "status").toLowerCase();

		if (groupMetadata?.subject) {
			group.name = groupMetadata.subject;
		}

		if (["status", "info"].includes(action)) {
			await m.reply(formatReminderStatus(config, m.prefix));
			return;
		}

		if (action === "on") {
			const nextConfig = {
				...config,
				enabled: true,
				updatedAt: Date.now(),
			};

			await saveReminderPayload(m.from, group, nextConfig);
			await m.reply(
				[
					"✅ *Reminder Grup Aktif*",
					"Bot akan mengirim reminder otomatis sesuai jadwal tanpa tag massal.",
					"",
					formatReminderStatus(nextConfig, m.prefix),
				].join("\n")
			);
			return;
		}

		if (action === "off") {
			const nextConfig = {
				...config,
				enabled: false,
				updatedAt: Date.now(),
			};

			await saveReminderPayload(m.from, group, nextConfig);
			await m.reply("🛑 Reminder grup dimatikan.");
			return;
		}

		if (["jam", "set", "time"].includes(action)) {
			const result = setReminderSlotTime(config, m.args[1], m.args[2]);

			if (result.status === "invalid_slot") {
				await m.reply(
					`Slot tidak dikenal. Pilih: ${DEFAULT_REMINDER_SLOTS.map((slot) => `\`${slot.key}\``).join(", ")}`
				);
				return;
			}

			if (result.status === "invalid_time") {
				await m.reply(
					`Format jam salah. Contoh: \`${m.prefix}reminder jam pagi 07:30\``
				);
				return;
			}

			await saveReminderPayload(m.from, group, result.config);
			await m.reply(
				`✅ Reminder *${result.slot.key}* diubah ke *${result.slot.time}*.`
			);
			return;
		}

		if (action === "test") {
			const slotKey = m.args[1] || "pagi";
			const slot = getReminderSlot(slotKey);

			if (!slot) {
				await m.reply(
					`Slot tidak dikenal. Pilih: ${DEFAULT_REMINDER_SLOTS.map((entry) => `\`${entry.key}\``).join(", ")}`
				);
				return;
			}

			await m.reply(formatReminderMessage(slot, m.prefix));
			return;
		}

		if (action === "reset") {
			const nextConfig = resetReminderConfig(config);

			await saveReminderPayload(m.from, group, nextConfig);
			await m.reply(
				[
					"✅ Jadwal reminder dikembalikan ke default.",
					"",
					formatReminderStatus(nextConfig, m.prefix),
				].join("\n")
			);
			return;
		}

		await m.reply(formatReminderStatus(config, m.prefix));
	},
};
