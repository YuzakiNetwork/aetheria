import { SUPABASE_CONFIG } from "#config/supabase";
import {
	getPlayerId,
	restoreCloudPlayerToWhatsApp,
	syncCurrentPlayerToSupabase,
} from "#lib/rpg";
import { createAccountLinkSession } from "#lib/supabase/accountLinking";

export default {
	name: "restore",
	description: "Pulihkan cloud save dari Google.",
	command: ["restore"],
	permissions: "all",
	category: "akun",
	cooldown: 15,
	usage: "$prefix$command [apply]",
	wait: null,

	async execute(m) {
		const jid = getPlayerId(m);
		const action = String(m.args[0] || "").toLowerCase();

		if (["apply", "confirm", "pakai"].includes(action)) {
			const result = await restoreCloudPlayerToWhatsApp(jid, m.pushName);

			if (result.status === "not_configured") {
				await m.reply("Login Google belum aktif.");
				return;
			}

			if (result.status === "missing") {
				await m.reply(
					[
						"Belum ada restore yang siap.",
						`Ketik ${m.prefix}restore lalu buka link Google dulu.`,
					].join("\n")
				);
				return;
			}

			if (result.status === "no_cloud_save") {
				await m.reply(
					"Cloud save belum ada. Login akun Google yang pernah menyimpan progress, atau sync dulu dengan .profil di akun lama."
				);
				return;
			}

			if (result.status !== "ok") {
				await m.reply(
					`Gagal restore: ${result.error?.message || result.status}`
				);
				return;
			}

			await m.reply(
				[
					"*Restore selesai*",
					`${result.player.name} Lv ${result.player.level}`,
					`Gold: ${result.player.gold}`,
					"",
					`Cek: ${m.prefix}profil`,
				].join("\n")
			);
			return;
		}

		await syncCurrentPlayerToSupabase(jid, m.pushName);

		const result = await createAccountLinkSession(
			jid,
			m.pushName,
			"restore"
		);

		if (result.status === "not_configured") {
			await m.reply(
				"Login Google belum aktif. Lengkapi konfigurasi Supabase dulu."
			);
			return;
		}

		if (result.status !== "ok") {
			await m.reply(
				`Gagal membuat link restore: ${result.error?.message || result.status}`
			);
			return;
		}

		await m.reply(
			[
				"*Restore Aetheria*",
				"Buka link ini dan masuk dengan Google yang punya cloud save:",
				result.link,
				"",
				`Setelah muncul sukses, kembali ke WhatsApp dan ketik: ${m.prefix}restore apply`,
				`Berlaku ${SUPABASE_CONFIG.linkTokenTtlMinutes} menit.`,
			].join("\n")
		);
	},
};
