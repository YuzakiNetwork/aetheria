import { BRAND_CONFIG } from "#config/brand";
import { formatSponsorMessage } from "#lib/supabase/monetization";

export default {
	name: "sponsor",
	description: "Lihat slot sponsor ringan untuk bantu operasional bot.",
	command: ["sponsor", "ads", "partner"],
	permissions: "all",
	category: "community",
	cooldown: 15,
	usage: "$prefix$command",
	wait: null,
	react: true,

	async execute(m) {
		const text = formatSponsorMessage(m.prefix);
		const buttons = [
			{
				text: "Donasi",
				id: `${m.prefix}donasi`,
			},
			{
				text: "Supporter Wall",
				id: `${m.prefix}donasi wall`,
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
