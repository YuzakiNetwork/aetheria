import { SUPABASE_CONFIG } from "#config/supabase";
import { getPlayerId } from "#lib/rpg";
import {
	createAccountLinkSession,
	getLinkedAccountByWhatsApp,
} from "#lib/supabase/accountLinking";
import { WAProto, generateWAMessageFromContent } from "baron-baileys-v2";

const USE_EXPERIMENTAL_CTA_URL =
	process.env.AETHERIA_WA_CTA_URL_ENABLED === "true";

function createCtaUrlMessage({ title, body, footer, buttonText, url }) {
	const interactiveMessage = WAProto.Message.InteractiveMessage.create({
		header: WAProto.Message.InteractiveMessage.Header.create({
			title,
			hasMediaAttachment: false,
		}),
		body: WAProto.Message.InteractiveMessage.Body.create({
			text: body,
		}),
		footer: WAProto.Message.InteractiveMessage.Footer.create({
			text: footer,
		}),
		nativeFlowMessage:
			WAProto.Message.InteractiveMessage.NativeFlowMessage.create({
				buttons: [
					WAProto.Message.InteractiveMessage.NativeFlowMessage.NativeFlowButton.create(
						{
							name: "cta_url",
							buttonParamsJson: JSON.stringify({
								display_text: buttonText,
								url,
								merchant_url: url,
							}),
						}
					),
				],
				messageParamsJson: JSON.stringify({}),
				messageVersion: 1,
			}),
	});

	return WAProto.Message.fromObject({
		viewOnceMessage: {
			message: {
				messageContextInfo: {
					deviceListMetadata: {},
					deviceListMetadataVersion: 2,
				},
				interactiveMessage,
			},
		},
	});
}

async function sendCtaUrl(sock, m, payload, fallbackText) {
	if (!USE_EXPERIMENTAL_CTA_URL) {
		await m.reply(fallbackText, { linkPreview: true });
		return;
	}

	if (!sock?.relayMessage || !sock?.user?.id) {
		await m.reply(fallbackText, { linkPreview: true });
		return;
	}

	try {
		const message = generateWAMessageFromContent(
			m.from,
			createCtaUrlMessage(payload),
			{
				quoted: m,
				userJid: sock.user.id,
			}
		);

		await sock.relayMessage(message.key.remoteJid, message.message, {
			messageId: message.key.id,
		});
	} catch {
		await m.reply(fallbackText, { linkPreview: true });
	}
}

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

			await sendCtaUrl(
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

		await sendCtaUrl(
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
