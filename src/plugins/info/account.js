import { SUPABASE_CONFIG } from "#config/supabase";
import { getPlayerId } from "#lib/rpg";
import { syncCurrentPlayerToSupabase } from "#lib/rpg";
import { getLinkedAccountByWhatsApp } from "#lib/supabase/accountLinking";

export default {
	name: "akun",
	description: "Cek status akun Google yang terhubung.",
	command: ["akun", "account"],
	permissions: "all",
	category: "akun",
	cooldown: 5,
	wait: null,

	async execute(m) {
		const result = await getLinkedAccountByWhatsApp(getPlayerId(m));

		if (result.status === "not_configured") {
			await m.reply("Login Google belum aktif.");
			return;
		}

		if (result.status === "missing") {
			await m.reply(`Belum terhubung.\nKetik: ${m.prefix}login`);
			return;
		}

		if (result.status !== "ok") {
			await m.reply(
				`Gagal cek akun: ${result.error?.message || result.status}`
			);
			return;
		}

		const profile = result.profile || {};
		const sync = await syncCurrentPlayerToSupabase(
			getPlayerId(m),
			m.pushName
		);
		const dashboardUrl = new URL("/dashboard", SUPABASE_CONFIG.publicUrl);

		await m.reply(
			[
				"*Akun Aetheria*",
				"Status: terhubung",
				`Email: ${profile.email || "-"}`,
				`Nama: ${profile.display_name || result.link.display_name || "-"}`,
				`Dashboard: ${dashboardUrl.toString()}`,
				`Sync: ${sync.status === "ok" ? "aktif" : sync.status}`,
			].join("\n")
		);
	},
};
