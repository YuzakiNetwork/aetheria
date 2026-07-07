import { BRAND_CONFIG } from "#config/brand";
import {
	formatDonationMessage,
	formatSponsorMessage,
	formatSupporterWall,
	getSupporterWall,
} from "#lib/supabase/monetization";

function normalizeMode(args = []) {
	return String(args[0] || "")
		.toLowerCase()
		.trim();
}

function claimText(prefix = ".") {
	return [
		"✅ *Klaim Supporter*",
		"━━━━━━━━━━━━━━━━━━━━",
		"Setelah donasi, kirim bukti pembayaran ke owner Aetheria.",
		"",
		"*Format bukti*",
		"1. Nomor WhatsApp yang ingin diaktifkan.",
		"2. Paket: Supporter atau Aether Pass.",
		"3. Bukti transfer/QRIS.",
		"",
		"Owner akan mengaktifkan manual agar tidak ada pembayaran palsu.",
		`Cek status setelah aktif: ${prefix}supporter`,
	].join("\n");
}

export default {
	name: "donasi",
	description: "Dukung operasional Aetheria dan cek supporter wall.",
	command: ["donasi", "donate", "support", "dukung", "operasional"],
	permissions: "all",
	category: "community",
	cooldown: 10,
	usage: [
		"$prefix$command",
		"$prefix$command wall",
		"$prefix$command klaim",
		"$prefix$command sponsor",
	],
	wait: null,
	react: true,

	async execute(m) {
		const mode = normalizeMode(m.args);

		if (["wall", "supporter", "donatur", "donor"].includes(mode)) {
			const wall = await getSupporterWall();
			await m.reply(formatSupporterWall(wall, m.prefix));
			return;
		}

		if (["klaim", "claim", "bukti"].includes(mode)) {
			await m.reply(claimText(m.prefix));
			return;
		}

		if (["sponsor", "iklan", "partner"].includes(mode)) {
			await m.reply(formatSponsorMessage(m.prefix));
			return;
		}

		const text = formatDonationMessage(m.prefix);
		const buttons = [
			{
				text: "Supporter Wall",
				id: `${m.prefix}${m.command} wall`,
			},
			{
				text: "Klaim",
				id: `${m.prefix}${m.command} klaim`,
			},
			{
				text: "Sponsor",
				id: `${m.prefix}sponsor`,
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
