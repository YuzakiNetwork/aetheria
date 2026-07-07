import { BRAND_CONFIG } from "#config/brand";
import {
	formatUpdateDetail,
	formatUpdateDetailRichResponse,
	formatUpdateList,
	formatUpdateListRichResponse,
	resolveUpdateEntry,
} from "#lib/updates";

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
	name: "update",
	description: "Lihat update dan changelog terbaru Aetheria.",
	command: ["update", "updates", "changelog", "news", "rilis"],
	permissions: "all",
	category: "info",
	cooldown: 10,
	usage: "$prefix$command [latest|nomor]",
	wait: null,
	react: true,

	async execute(m) {
		const query = m.args[0] || "";

		if (!query) {
			const text = formatUpdateList(m.prefix);
			const richPayload = formatUpdateListRichResponse(m.prefix);
			const buttons = [
				{
					text: "Terbaru",
					id: `${m.prefix}update latest`,
				},
				{
					text: "Status",
					id: `${m.prefix}status`,
				},
				{
					text: "RPG",
					id: `${m.prefix}rpg`,
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
			return;
		}

		const entry = resolveUpdateEntry(query);

		if (!entry) {
			await m.reply(
				[
					"Update tidak ditemukan.",
					`Cek daftar: ${m.prefix}update`,
				].join("\n")
			);
			return;
		}

		const text = formatUpdateDetail(entry, m.prefix);
		const richPayload = formatUpdateDetailRichResponse(entry, m.prefix);
		const buttons = [
			{
				text: "Daftar Update",
				id: `${m.prefix}update`,
			},
			{
				text: "Feedback",
				id: `${m.prefix}feedback`,
			},
			{
				text: "Menu",
				id: `${m.prefix}help`,
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
