import {
	clearLocalRpgPlayer,
	getPlayerId,
	syncCurrentPlayerToSupabase,
} from "#lib/rpg";
import {
	getLinkedAccountByWhatsApp,
	unlinkWhatsAppAccount,
} from "#lib/supabase/accountLinking";

export default {
	name: "logout",
	description: "Lepas Google dari WhatsApp ini.",
	command: ["logout", "unlink"],
	permissions: "all",
	category: "akun",
	cooldown: 8,
	usage: "$prefix$command confirm",
	wait: null,

	async execute(m) {
		const jid = getPlayerId(m);
		const confirmed = ["confirm", "konfirmasi", "ya"].includes(
			String(m.args[0] || "").toLowerCase()
		);
		const account = await getLinkedAccountByWhatsApp(jid);

		if (account.status === "not_configured") {
			await m.reply("Login Google belum aktif.");
			return;
		}

		if (account.status === "missing") {
			await m.reply(`Saat ini masih guest.\nKetik: ${m.prefix}login`);
			return;
		}

		if (account.status !== "ok") {
			await m.reply(
				`Gagal cek akun: ${account.error?.message || account.status}`
			);
			return;
		}

		if (!confirmed) {
			await m.reply(
				[
					"*Logout Aetheria*",
					"Akun Google akan dilepas dari WhatsApp ini.",
					"Cloud save tetap aman di Google.",
					"Nomor ini tidak akan memegang karakter aktif setelah logout.",
					"",
					`Email: ${account.profile?.email || "-"}`,
					`Ketik: ${m.prefix}${m.command} confirm`,
				].join("\n")
			);
			return;
		}

		await syncCurrentPlayerToSupabase(jid, m.pushName);

		const result = await unlinkWhatsAppAccount(jid);

		if (result.status !== "ok") {
			await m.reply(
				`Gagal logout: ${result.error?.message || result.status}`
			);
			return;
		}

		await clearLocalRpgPlayer(jid);

		await m.reply(
			[
				"Google sudah dilepas.",
				"Nomor ini sekarang belum punya karakter aktif.",
				`Ketik ${m.prefix}mulai untuk guest baru, atau ${m.prefix}restore untuk memakai cloud save lain.`,
			].join("\n")
		);
	},
};
