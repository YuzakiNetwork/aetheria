import { SUPABASE_CONFIG } from "#config/supabase";
import { getPlayerId } from "#lib/rpg";
import {
	createAccountLinkSession,
	getLinkedAccountByWhatsApp,
} from "#lib/supabase/accountLinking";
import { sendCtaUrlButton } from "#lib/whatsappButtons";

function buildLoginFallback(link) {
	return [
		"*Login Aetheria*",
		"Tekan link ini untuk masuk dengan Google:",
		link,
		"",
		`Berlaku ${SUPABASE_CONFIG.linkTokenTtlMinutes} menit.`,
	].join("\n");
}

function buildDashboardUrl() {
	return new URL("/dashboard", SUPABASE_CONFIG.publicUrl).toString();
}

export default {
	name: "login",
	description: "Hubungkan akun Google ke Aetheria.",
	command: ["login", "connect"],
	permissions: "all",
	category: "akun",
	cooldown: 20,
	wait: null,

	async execute(m, context) {
		const sock = context?.sock;
		const playerId = getPlayerId(m);
		const linked = await getLinkedAccountByWhatsApp(playerId);

		if (linked.status === "not_configured") {
			await m.reply(
				"Login Google belum aktif. Lengkapi SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, dan jalankan schema Supabase."
			);
			return;
		}

		if (linked.status === "ok") {
			const profile = linked.profile || {};
			const dashboardUrl = buildDashboardUrl();
			const fallback = [
				"*Akun sudah terhubung*",
				`Email: ${profile.email || "-"}`,
				`Nama: ${profile.display_name || linked.link.display_name || "-"}`,
				`Dashboard: ${dashboardUrl}`,
				"",
				`Mau ganti akun? Ketik ${m.prefix}logout confirm lalu login lagi.`,
			].join("\n");

			await sendCtaUrlButton(
				sock,
				m,
				{
					title: "Aetheria",
					body: "Akun Google kamu sudah terhubung.",
					footer: "Buka dashboard untuk melihat progres akun.",
					buttonText: "Buka Dashboard",
					url: dashboardUrl,
				},
				fallback
			);
			return;
		}

		if (linked.status !== "missing") {
			await m.reply(
				`Gagal cek akun: ${linked.error?.message || linked.status}`
			);
			return;
		}

		const result = await createAccountLinkSession(playerId, m.pushName);

		if (result.status !== "ok") {
			await m.reply(
				`Gagal membuat link login: ${result.error?.message || result.status}`
			);
			return;
		}

		await sendCtaUrlButton(
			sock,
			m,
			{
				title: "Login Aetheria",
				body: "Masuk dengan Google untuk menyimpan progres akun.",
				footer: `Link berlaku ${SUPABASE_CONFIG.linkTokenTtlMinutes} menit.`,
				buttonText: "Login Google",
				url: result.link,
			},
			buildLoginFallback(result.link)
		);
	},
};
