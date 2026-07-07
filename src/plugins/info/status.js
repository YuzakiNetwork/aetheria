import { BRAND_CONFIG } from "#config/brand";
import {
	formatPublicStatus,
	formatPublicStatusRichResponse,
	getBotNumber,
} from "#lib/community";
import { SettingsModel } from "#lib/database/index";

async function tryReplyRich(m, payload) {
	if (typeof m.replyRichResponse !== "function") {
		return false;
	}

	try {
		await m.replyRichResponse(payload, {
			fallbackText: payload.fallbackText,
		});
		return true;
	} catch {
		return false;
	}
}

export default {
	name: "status",
	description: "Lihat status bot, shortcut, dan link publik Aetheria.",
	command: ["status", "about", "botinfo"],
	permissions: "all",
	category: "info",
	cooldown: 10,
	usage: "$prefix$command",
	wait: null,
	react: true,

	async execute(m, { plugins, pluginManager, sock }) {
		const settings = await SettingsModel.getSettings();
		const statusPayload = {
			botNumber: getBotNumber(sock),
			brand: BRAND_CONFIG,
			memory: process.memoryUsage(),
			plugins,
			prefix: m.prefix,
			queueStatus: pluginManager?.getQueueStatus?.() || {},
			settings,
			uptimeMs: process.uptime() * 1000,
		};
		const text = formatPublicStatus(statusPayload);
		const richPayload = formatPublicStatusRichResponse(statusPayload);
		const buttons = [
			{
				text: "Menu",
				id: `${m.prefix}help`,
			},
			{
				text: "RPG",
				id: `${m.prefix}rpg`,
			},
			{
				text: "Feedback",
				id: `${m.prefix}feedback`,
			},
		];

		if (await tryReplyRich(m, richPayload)) {
			return;
		}

		if (typeof m.replyInteractive === "function") {
			await m.replyInteractive(text, buttons, {
				footer: BRAND_CONFIG.name,
			});
			return;
		}

		if (typeof m.replyButtons === "function") {
			await m.replyButtons(text, buttons, {
				footer: BRAND_CONFIG.name,
			});
			return;
		}

		await m.reply(text);
	},
};
