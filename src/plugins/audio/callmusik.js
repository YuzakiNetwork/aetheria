// .callmusik — place a WhatsApp voice call to a phone number and
// play music (YouTube audio) over the call. Requires ffmpeg on PATH
// and baileys-caller (installed as a peer dependency). The VoIP socket
// uses a separate auth state directory (auth_info_voip/) so it doesn't
// conflict with the main bot's WhatsApp socket.
import { getActiveCall, normalizePhone, placeCall } from "#lib/callAdapter";
import { downloadYt, isYoutubeUrl } from "#lib/yt-dlp";

const MAX_DURATION_MS = 5 * 60 * 1000;
const PHONE_USAGE_HINT =
	"Contoh: .callmusik 628123456789 <youtube-url>\n" +
	"Nomor phone harus digits only, audio YouTube maks 5 menit.";

export default {
	name: "callmusik",
	command: ["callmusik", "callmusic", "musikcall"],
	hidden: false,
	description: "Telepon WhatsApp + play musik YouTube via voice call.",
	usage: ".callmusik <nomor> <youtube-url>",
	execute: async (m, { args }) => {
		if (!args || args.length < 2) {
			return m.reply(PHONE_USAGE_HINT);
		}

		const phone = normalizePhone(args[0]);
		const query = args.slice(1).join(" ").trim();

		if (!phone) {
			return m.reply("Nomor telepon kosong.\n" + PHONE_USAGE_HINT);
		}

		if (!query) {
			return m.reply("URL YouTube kosong.\n" + PHONE_USAGE_HINT);
		}

		const url = isYoutubeUrl(query)
			? query
			: `https://www.youtube.com/watch?v=${encodeURIComponent(query)}`;

		if (getActiveCall()) {
			return m.reply(
				"Sedang ada call berlangsung. Ketik .callend untuk menutup."
			);
		}

		await m.reply(`⏳ Download audio dari YouTube...\n${url}`);
		let mediaPath;
		try {
			mediaPath = await downloadYt(url, {
				video: false,
				title: "callmusik",
			});
		} catch (error) {
			return m.reply(
				`Download YouTube gagal: ${error?.message || error}`
			);
		}

		if (!mediaPath) {
			return m.reply("Download YouTube gagal: file tidak ditemukan.");
		}

		await m.reply(`📞 Menelpon ${phone}...`);
		try {
			const call = await placeCall(phone, {
				audioSource: mediaPath,
				durationMs: MAX_DURATION_MS,
			});

			call.on("connected", () =>
				m.reply("✅ Call terhubung. Memutar musik...")
			);
			call.on("ended", (reason) =>
				m.reply(`📴 Call berakhir: ${reason || "selesai"}.`)
			);

			return m.reply(
				`📞 Call ke ${phone} dihubukan. Musik: ${url}\nKetik .callend untuk menutup.`
			);
		} catch (error) {
			return m.reply(`Gagal menelpon: ${error?.message || error}`);
		}
	},
};
