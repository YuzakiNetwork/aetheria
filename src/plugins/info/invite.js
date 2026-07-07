import { BRAND_CONFIG } from "#config/brand";
import { formatInviteMessage, getBotNumber } from "#lib/community";

export default {
	name: "invite",
	description: "Buat teks ajakan untuk membagikan Aetheria ke teman.",
	command: ["invite", "share", "ajak", "promosi"],
	permissions: "all",
	category: "community",
	cooldown: 15,
	usage: "$prefix$command",
	wait: null,
	react: true,

	async execute(m, { sock }) {
		const text = formatInviteMessage({
			botNumber: getBotNumber(sock),
			prefix: m.prefix,
		});
		const buttons = [
			{
				text: "RPG",
				id: `${m.prefix}rpg`,
			},
			{
				text: "Update",
				id: `${m.prefix}update`,
			},
			{
				text: "Feedback",
				id: `${m.prefix}feedback`,
			},
		];

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
