import { getPlayerId } from "#lib/rpg";
import {
	formatPremiumStatus,
	getPremiumStatusByWhatsApp,
} from "#lib/supabase/monetization";

export default {
	name: "premium",
	description: "Cek Supporter dan Aether Pass.",
	command: ["premium", "supporter", "aetherpass", "pass"],
	permissions: "all",
	category: "akun",
	cooldown: 5,
	usage: "$prefix$command",
	wait: null,

	async execute(m) {
		const result = await getPremiumStatusByWhatsApp(getPlayerId(m));

		if (result.status === "not_configured") {
			await m.reply("Premium belum aktif. Supabase belum dikonfigurasi.");
			return;
		}

		if (result.status !== "ok") {
			await m.reply(
				`Gagal cek premium: ${result.error?.message || result.status}`
			);
			return;
		}

		await m.reply(formatPremiumStatus(result, m.prefix));
	},
};
