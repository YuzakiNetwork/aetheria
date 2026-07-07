import { BOT_CONFIG } from "#config/index";
import { GroupModel } from "#lib/database/index";
import {
	GROUP_TOPIC_PAYLOAD_KEY,
	buildTopicSuggestion,
	formatTopicStatus,
	getDueTopic,
	getGroupDescription,
	getGroupPayloads,
	getGroupSubject,
	markTopicSent,
	normalizeTopicConfig,
} from "#lib/groupCommunity";
import print from "#lib/print";

const TOPIC_INTERVAL_MS = 60 * 1000;
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

function needsAdmin(action) {
	return ["on", "off", "jam", "time", "set", "kategori", "category"].includes(
		action
	);
}

async function saveTopicPayload(groupId, group, config) {
	await GroupModel.setGroup(groupId, {
		name: group?.name || group?.subject || "",
		payloads: {
			...getGroupPayloads(group),
			[GROUP_TOPIC_PAYLOAD_KEY]: normalizeTopicConfig(config),
		},
	});
}

async function getAllGroups() {
	if (typeof GroupModel.getAllGroups === "function") {
		return GroupModel.getAllGroups();
	}

	return [];
}

async function runTopicTick(sock) {
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
			const config = normalizeTopicConfig(
				payloads[GROUP_TOPIC_PAYLOAD_KEY]
			);
			const due = getDueTopic(config, now);

			if (!due) {
				continue;
			}

			let metadata = null;

			try {
				metadata = await sock.groupMetadata(groupId);
			} catch (error) {
				print.error(`[AutoTopic] Failed fetching ${groupId}:`, error);
			}

			const text = buildTopicSuggestion(
				config,
				{
					groupId,
					groupName: getGroupSubject(metadata, group.name),
					description: getGroupDescription(metadata),
					prefix: DEFAULT_PREFIX,
				},
				now
			);

			try {
				await sock.sendMessage(groupId, { text });
				await saveTopicPayload(
					groupId,
					group,
					markTopicSent(config, due.dayKey)
				);
				print.debug(`💬 [AutoTopic] Sent daily topic to ${groupId}`);
				await delay(SEND_DELAY_MS);
			} catch (error) {
				print.error(`[AutoTopic] Failed sending to ${groupId}:`, error);
			}
		}
	} finally {
		isRunning = false;
	}
}

async function replyWithTopicButtons(m, text) {
	const buttons = [
		{
			text: "Topik Baru",
			id: `${m.prefix}topik`,
		},
		{
			text: "Status",
			id: `${m.prefix}topik status`,
		},
		{
			text: "Aktifkan",
			id: `${m.prefix}topik on`,
		},
	];

	if (typeof m.replyInteractive === "function") {
		await m.replyInteractive(text, buttons, {
			footer: "Aetheria Auto Topic",
		});
		return;
	}

	if (typeof m.replyButtons === "function") {
		await m.replyButtons(text, buttons, {
			footer: "Aetheria Auto Topic",
		});
		return;
	}

	await m.reply(text);
}

export default {
	name: "group-topic",
	description: "Generate topik obrolan dan auto topic harian untuk grup.",
	command: ["topik", "topic", "autotopic"],
	permissions: "all",
	category: "group",
	cooldown: 5,
	group: true,
	usage: "$prefix$command [on|off|jam|kategori|status]",
	wait: null,
	react: true,
	periodic: {
		enabled: true,
		type: "interval",
		interval: TOPIC_INTERVAL_MS,
		run: async function (_, { sock }) {
			await runTopicTick(sock);
		},
	},

	async execute(m, { groupMetadata, isAdmin, isOwner }) {
		const group = await GroupModel.getGroup(m.from);
		const config = normalizeTopicConfig(
			getGroupPayloads(group)[GROUP_TOPIC_PAYLOAD_KEY]
		);
		const action = String(m.args[0] || "now")
			.toLowerCase()
			.trim();

		if (needsAdmin(action) && !isAdmin && !isOwner) {
			await m.reply("Auto topic hanya bisa diatur admin grup.");
			return;
		}

		if (["status", "help", "info", "bantuan"].includes(action)) {
			await m.reply(formatTopicStatus(config, m.prefix));
			return;
		}

		if (action === "on") {
			const nextConfig = {
				...config,
				enabled: true,
				updatedAt: Date.now(),
			};

			await saveTopicPayload(m.from, group, nextConfig);
			await m.reply(
				[
					"✅ *Auto Topic Aktif*",
					"Bot akan mengirim topik ringan sesuai jadwal grup.",
					"",
					formatTopicStatus(nextConfig, m.prefix),
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

			await saveTopicPayload(m.from, group, nextConfig);
			await m.reply("🛑 Auto topic dimatikan.");
			return;
		}

		if (["jam", "time", "set"].includes(action)) {
			const time = String(m.args[1] || "").trim();

			if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(time)) {
				await m.reply(
					`Format jam salah. Contoh: ${m.prefix}topik jam 20:30`
				);
				return;
			}

			const nextConfig = normalizeTopicConfig({
				...config,
				time,
				updatedAt: Date.now(),
			});

			await saveTopicPayload(m.from, group, nextConfig);
			await m.reply(`✅ Jam auto topic diubah ke *${nextConfig.time}*.`);
			return;
		}

		if (["kategori", "category"].includes(action)) {
			const category = String(m.args[1] || "auto").toLowerCase();
			const nextConfig = normalizeTopicConfig({
				...config,
				category,
				updatedAt: Date.now(),
			});

			await saveTopicPayload(m.from, group, nextConfig);
			await m.reply(
				`✅ Kategori topik diubah ke *${nextConfig.category}*.`
			);
			return;
		}

		const text = buildTopicSuggestion(config, {
			groupId: m.from,
			groupName: getGroupSubject(groupMetadata, group.name),
			description: getGroupDescription(groupMetadata),
			prefix: m.prefix,
		});

		await replyWithTopicButtons(m, text);
	},
};
