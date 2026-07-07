import { sleep } from "#lib/functions";
import { Pinterest } from "#lib/scrapers/pinterest";
import fs from "node:fs/promises";
import path from "node:path";

const MAX_ALBUM_ITEMS = 10;

export default {
	name: "pinterest",
	description:
		"Pinterest search & downloader (supports pin.it / pinterest.com).",
	command: ["pin", "pinterest"],
	usage: [
		"$prefix$command https://pin.it/xxxx",
		"$prefix$command chitoge kirisaki",
		"$prefix$command chitoge kirisaki -10",
		"$prefix$command reply image (lens)",
	],
	permissions: "all",
	hidden: false,
	failed: "Failed to execute %command: %error",
	wait: null,
	category: "downloader",
	cooldown: 5,
	limit: true,
	react: true,
	botAdmin: false,
	group: false,
	private: false,
	owner: false,

	execute: async (m) => {
		const input =
			m.text && m.text.trim() !== ""
				? m.text.trim()
				: m.quoted && (m.quoted.url || m.quoted.text)
					? String(m.quoted.url || m.quoted.text).trim()
					: null;

		const delayMs = 4000;

		const p = new Pinterest();

		const q = m.isQuoted ? m.quoted : m;
		const mime = q?.type || q?.mimetype || q?.mime || "";

		if (/image/i.test(mime)) {
			const tmpPath = "./tmp/pinterest.jpg";
			const bytes = await q.download?.();
			if (!bytes) {
				return m.reply("Failed to download image.");
			}

			await fs.mkdir(path.dirname(tmpPath), { recursive: true });
			await fs.writeFile(tmpPath, Buffer.from(bytes));

			const results = await p.lensFile(tmpPath, {
				filename: "pinterest.jpg",
				crop: { x: 0, y: 0, w: 1, h: 1 },
			});

			if (!results?.length) {
				return m.reply("Lens: Not found.");
			}

			const top = results.slice(0, MAX_ALBUM_ITEMS);

			const text =
				"*_🔎 PINTEREST LENS_*\n\n" +
				`*Result*: ${top.length}/${results.length}\n\n` +
				top
					.map((it, i) => {
						const title = it.title || "-";
						const desc = (it.description || "-").slice(0, 160);

						return (
							`*${i + 1}.* ${title}\n` +
							`• *Image*: ${it.page || "-"}\n` +
							`• *Large*: ${it.image_large || "-"}\n` +
							`• *Medium*: ${it.image_medium || "-"}\n` +
							`• *Square*: ${it.image_square || "-"}\n` +
							`• *Domain*: ${it.domain || "-"}\n` +
							`• *Link*: ${it.link || "-"}\n` +
							`• *Desc*: ${desc}\n` +
							`• *Repin*: ${it.repin_count ?? "-"} | *Uploaded*: ${it.is_uploaded ?? "-"} | *Video*: ${it.is_video ? "yes" : "no"}`
						);
					})
					.join("\n\n");

			const albumItems = buildLensAlbumItems(top);

			if (!albumItems.length) {
				await m.reply(text.trim());
				await fs.unlink(tmpPath).catch(() => {});
				return;
			}

			await sendPinterestAlbum(m, albumItems, text.trim());
			await fs.unlink(tmpPath).catch(() => {});
			return;
		}

		if (!input) {
			return m.reply(
				"Input query or link Pinterest.\n" +
					"Example:\n" +
					`- *${m.prefix + m.command}* cat -10 (default 1)\n` +
					`- *${m.prefix + m.command}* https://pin.it/xxxx`
			);
		}

		if (m.isUrl(input) && isPinterestLink(input)) {
			const info = await p.download(input);

			if (!info?.src) {
				return m.reply("Failed to get media.");
			}

			const caption =
				"*_📌 PINTEREST DOWNLOADER*_\n\n" +
				`*🔗 URL*: ${info.finalUrl}\n` +
				`*📦 Type*: ${info.type}\n` +
				`*📝 Description*: ${info.description || "-"}\n`;

			if (info.type === "video") {
				await m.reply({
					video: { url: info.src },
					caption: caption.trim(),
				});
			} else {
				await m.reply({
					image: { url: info.src },
					caption: caption.trim(),
				});
			}
			return;
		}

		const { query, limit } = parseLimitFlag(input, 1, 1, MAX_ALBUM_ITEMS);
		if (!query) {
			return m.reply(
				`Input query. Example: ${m.prefix + m.command} cat -10`
			);
		}

		const results = await p.search(query);

		if (!Array.isArray(results) || results.length === 0) {
			return m.reply("Query not found.");
		}

		const picked = results.slice(0, limit);

		await m.reply(
			"*🔎 PINTEREST SEARCH*\n\n" +
				`*Query*: ${query}\n` +
				`*Result*: ${picked.length}/${results.length}\n` +
				"*Tip*: use *-10* to get 10 results"
		);

		const albumItems = buildSearchAlbumItems(picked);

		if (albumItems.length) {
			await sendPinterestAlbum(m, albumItems);
			return;
		}

		await sendPinterestItemsIndividually(m, picked, delayMs);
	},
};

function isPinterestLink(s) {
	return /(^https?:\/\/)?(www\.)?(pin\.it|pinterest\.com)\//i.test(s);
}

/**
 * Parse "-N" at the end (or anywhere) from user input.
 * Example: "chitoge kirisaki -10" -> { query: "chitoge kirisaki", limit: 10 }
 */
function parseLimitFlag(text, def = 5, min = 1, max = MAX_ALBUM_ITEMS) {
	const tokens = text.trim().split(/\s+/);
	let limit = def;

	const idx = [...tokens].reverse().findIndex((t) => /^-\d+$/.test(t));
	if (idx !== -1) {
		const realIdx = tokens.length - 1 - idx;
		const n = parseInt(tokens[realIdx].slice(1), 10);
		if (!Number.isNaN(n)) {
			limit = n;
		}
		tokens.splice(realIdx, 1);
	}

	limit = Math.max(min, Math.min(max, limit));
	const query = tokens.join(" ").trim();

	return { query, limit };
}

function buildLensAlbumItems(items = []) {
	return items
		.map((item, index) => {
			const imageUrl =
				item.image_large ||
				item.image ||
				item.image_medium ||
				item.image_square;

			if (!imageUrl) {
				return null;
			}

			const caption = [
				`*${index + 1}. ${item.title || "Pinterest Lens"}*`,
				`*Domain*: ${item.domain || "-"}`,
				`*Link*: ${item.link || item.page || "-"}`,
			].join("\n");

			return {
				caption,
				image: { url: imageUrl },
			};
		})
		.filter(Boolean);
}

function buildSearchAlbumItems(items = []) {
	return items
		.map((item, index) => {
			const caption = [
				`*${index + 1}. ${item.type === "video" ? "🎞️" : "🖼️"} ${item.title || "Untitled"}*`,
				`*👤 Author*: ${item.author || "-"}`,
				`*🔗 Source*: ${item.source}`,
			].join("\n");

			if (item.type === "video" && item.video) {
				return {
					caption,
					video: { url: item.video },
				};
			}

			if (item.image) {
				return {
					caption,
					image: { url: item.image },
				};
			}

			return null;
		})
		.filter(Boolean);
}

async function sendPinterestAlbum(m, albumItems = [], introText = "") {
	if (albumItems.length === 1) {
		await m.reply(albumItems[0]);
		return;
	}

	if (albumItems.length > 1) {
		try {
			if (introText) {
				await m.reply(introText);
			}

			await m.reply({ album: albumItems });
			return;
		} catch (error) {
			console.warn("[Pinterest] Album send failed, fallback:", error);
		}
	}

	await sendAlbumItemsIndividually(m, albumItems);
}

async function sendAlbumItemsIndividually(m, albumItems = [], delayMs = 2500) {
	for (let i = 0; i < albumItems.length; i += 1) {
		await m.reply(albumItems[i]);

		if (i < albumItems.length - 1) {
			await sleep(delayMs);
		}
	}
}

async function sendPinterestItemsIndividually(m, picked = [], delayMs = 4000) {
	const albumItems = buildSearchAlbumItems(picked);

	if (!albumItems.length) {
		await m.reply(
			"Pinterest result tidak memiliki media yang bisa dikirim."
		);
		return;
	}

	await sendAlbumItemsIndividually(m, albumItems, delayMs);
}

export { buildLensAlbumItems, buildSearchAlbumItems, parseLimitFlag };
