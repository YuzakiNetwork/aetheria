import { downloadApiYt, downloadYt } from "#lib/yt-dlp";

const MAX_YOUTUBE_FILE_SIZE = 100 * 1024 * 1024;

function normalizeYoutubeUrl(url = "") {
	const trimmed = String(url || "").trim();

	if (!trimmed) {
		return "";
	}

	return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

async function downloadYoutubeMedia(url, options = {}) {
	try {
		return await downloadApiYt(url, options);
	} catch (apiError) {
		console.warn(
			"[YouTube] API downloader failed, trying yt-dlp:",
			apiError
		);

		try {
			return await downloadYt(url, options);
		} catch (ytDlpError) {
			const message = [
				"Download YouTube gagal.",
				`API: ${apiError?.message || apiError}`,
				`yt-dlp: ${ytDlpError?.message || ytDlpError}`,
			].join("\n");

			throw new Error(message);
		}
	}
}

async function sendYoutubeResult(m, result, isVideo) {
	const mimetype = result.mimetype || (isVideo ? "video/mp4" : "audio/mpeg");

	if (result.buffer.length > MAX_YOUTUBE_FILE_SIZE) {
		await m.reply({
			caption: result.fileName,
			document: result.buffer,
			fileName: result.fileName,
			mimetype,
		});
		return;
	}

	if (isVideo) {
		await m.reply({
			caption: result.fileName,
			mimetype,
			video: result.buffer,
		});
		return;
	}

	await m.reply({
		audio: result.buffer,
		fileName: result.fileName,
		mimetype,
	});
}

export default {
	name: "play",
	description: "Youtube & Downloader (audio/video)",
	command: ["yt", "youtube", "play"],
	usage: "$prefix$command <query/link> [-video]",
	category: "downloader",
	permissions: "all",
	hidden: false,
	failed: "Failed to execute %command: %error",
	wait: null,
	cooldown: 5,
	limit: true,
	react: true,
	botAdmin: false,
	group: false,
	private: false,
	owner: false,

	execute: async (m, { sock, api }) => {
		if (!sock.youtube) {
			sock.youtube = {};
		}
		const sessionKey = m.senderPn || m.sender;

		let input =
			m.text && m.text.trim() !== ""
				? m.text.trim()
				: m.quoted && m.quoted.text
					? m.quoted.text.trim()
					: null;

		const videoFlag = /(?:^|\s)-(video)\b/i;
		let isVideo = input ? videoFlag.test(input) : false;
		if (isVideo) {
			input = input.replace(videoFlag, "").trim();
		}

		if (!input) {
			return m.reply("Please provide a YouTube title, link, or query.");
		}

		const urlMatch = input
			? input.match(
					/(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/\S+/i
				)
			: null;
		const isLink = !!urlMatch;
		const url = urlMatch ? normalizeYoutubeUrl(urlMatch[0]) : null;

		if (isLink) {
			await m.reply(`⏳ Downloading ${isVideo ? "video" : "audio"}...`);
			const result = await downloadYoutubeMedia(url, {
				video: isVideo,
			});
			await sendYoutubeResult(m, result, isVideo);
			return;
		}

		const response = await api.Sayuran.get("/search/yt", { q: input });
		const { status, message, result } = response?.data || {};

		if (!status || !Array.isArray(result) || !result.length) {
			return m.reply(message || "YouTube search tidak menemukan hasil.");
		}

		const listMsg = result
			.map(
				(v, i) =>
					`*${i + 1}.* *${v.title}*\n` +
					`Channel: ${v.author}\n` +
					`Duration: ${v.duration} \n` +
					`Views: ${v.views}\n` +
					`URL:\n${v.url}\n`
			)
			.join("\n");

		const sent = await m.reply(
			"*YouTube Search*\n\n" +
				`Query: _${input}_\n` +
				`Format: *${isVideo ? "Video" : "Audio"}*\n\n` +
				"_Please reply with the *number* of you wish to download._\n\n" +
				"*List:*\n" +
				`${listMsg}`.trim()
		);
		sock.youtube[sessionKey] = {
			results: result,
			isVideo,
			messageId: sent.key.id,
		};

		setTimeout(() => {
			if (sock.youtube[sessionKey]?.messageId === sent.key.id) {
				delete sock.youtube[sessionKey];
			}
		}, 90000);
	},

	after: async (m, { sock }) => {
		const sessionKey = m.senderPn || m.sender;
		const session = sock.youtube?.[sessionKey];
		if (!session || !m.quoted || m.quoted.id !== session.messageId) {
			return;
		}

		const { results, isVideo } = session;
		const idx = parseInt(m.body.trim(), 10);
		if (isNaN(idx) || idx < 1 || idx > results.length) {
			m.reply(
				"Invalid number. Please run the command again to start a new search."
			);
			delete sock.youtube[sessionKey];
			return;
		}

		const chosen = results[idx - 1];

		await m.reply(
			"Preparing your download...\n\n" +
				`Title: *${chosen.title}*\n` +
				`Channel: *${chosen.author}*\n` +
				`Duration: *${chosen.duration}*\n` +
				`Format: *${isVideo ? "Video" : "Audio"}*\n\n` +
				"_Your file will be sent shortly._".trim()
		);

		const result = await downloadYoutubeMedia(chosen.url, {
			video: isVideo,
			title: chosen.title,
		});
		await sendYoutubeResult(m, result, isVideo);
		delete sock.youtube[sessionKey];
	},
};

export { downloadYoutubeMedia, normalizeYoutubeUrl, sendYoutubeResult };
