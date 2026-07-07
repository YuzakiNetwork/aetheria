import { delay } from "#lib/functions";
import { to_audio } from "#utils/converter";
import axios from "axios";
import { execFile } from "child_process";
import {
	accessSync,
	chmodSync,
	constants,
	existsSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from "fs";
import { mkdir, rename } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join } from "path";
import util from "util";

const execFilePromise = util.promisify(execFile);
const YTDLP_RELEASE_BASE =
	"https://github.com/yt-dlp/yt-dlp/releases/latest/download";
const YTDLP_GENERIC_DOWNLOAD_URL = `${YTDLP_RELEASE_BASE}/yt-dlp`;
const DEFAULT_STREAM_FORMAT =
	process.env.AETHERIA_YTDLP_STREAM_FORMAT ||
	"bestaudio[abr<=160]/bestaudio[ext=m4a]/bestaudio/best";
let ytDlpDownloadPromise = null;
let ytDlpPreferGenericBinary = false;
const ytDlpRejectedBinaries = new Set();
let ytDlpResolvedBinary = null;

function isExecutable(filePath) {
	try {
		accessSync(filePath, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}

function getYtDlpAssetName({
	arch = process.arch,
	platform = process.platform,
} = {}) {
	if (platform === "win32") {
		return "yt-dlp.exe";
	}

	if (platform === "darwin") {
		return "yt-dlp_macos";
	}

	if (platform === "linux") {
		if (arch === "arm64" || arch === "aarch64") {
			return "yt-dlp_linux_aarch64";
		}

		return "yt-dlp_linux";
	}

	return "yt-dlp";
}

function getYtDlpDownloadUrl(runtime = process) {
	if (process.env.AETHERIA_YTDLP_DOWNLOAD_URL) {
		return process.env.AETHERIA_YTDLP_DOWNLOAD_URL;
	}

	return `${YTDLP_RELEASE_BASE}/${getYtDlpAssetName({
		arch: runtime.arch,
		platform: runtime.platform,
	})}`;
}

function getYtDlpDownloadUrls(runtime = process) {
	if (process.env.AETHERIA_YTDLP_DOWNLOAD_URL) {
		return [process.env.AETHERIA_YTDLP_DOWNLOAD_URL];
	}

	const urls = [getYtDlpDownloadUrl(runtime), YTDLP_GENERIC_DOWNLOAD_URL];

	if (ytDlpPreferGenericBinary) {
		urls.reverse();
	}

	return urls.filter((url, index) => url && urls.indexOf(url) === index);
}

function getYtDlpCachePath() {
	const fileName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
	const cacheDir =
		process.env.AETHERIA_YTDLP_CACHE_DIR ||
		join(process.cwd(), ".cache", "yt-dlp");

	return join(cacheDir, fileName);
}

function getYtDlpCandidates() {
	return [
		process.env.YTDLP_PATH,
		join(process.cwd(), "yt-dlp"),
		join(process.cwd(), "bin", "yt-dlp"),
		getYtDlpCachePath(),
		"/usr/local/bin/yt-dlp",
		"/usr/bin/yt-dlp",
	].filter(Boolean);
}

function summarizeYtDlpError(error) {
	const parts = [
		error?.code ? `code=${error.code}` : "",
		error?.signal ? `signal=${error.signal}` : "",
		error?.message || String(error || ""),
		error?.stderr ? String(error.stderr).trim().slice(-500) : "",
		error?.stdout ? String(error.stdout).trim().slice(-200) : "",
	].filter(Boolean);

	return parts.join(" | ") || "unknown error";
}

function getYtDlpErrorText(error) {
	return [error?.message, error?.stderr, error?.stdout, String(error || "")]
		.filter(Boolean)
		.join("\n");
}

function isYtDlpRuntimeBinaryError(error) {
	return /\[PYI-\d+:ERROR\]|Failed to extract|decompression resulted|curl_cffi\/_wrapper/i.test(
		getYtDlpErrorText(error)
	);
}

async function checkYtDlpBinary(binary) {
	try {
		const { stdout } = await execFilePromise(binary, ["--version"], {
			timeout:
				Number(process.env.AETHERIA_YTDLP_CHECK_TIMEOUT_MS) || 30000,
			windowsHide: true,
		});

		return {
			ok: true,
			version: String(stdout || "").trim(),
		};
	} catch (error) {
		return {
			error: summarizeYtDlpError(error),
			ok: false,
		};
	}
}

async function downloadYtDlpBinary(targetPath = getYtDlpCachePath()) {
	if (process.env.AETHERIA_YTDLP_AUTO_DOWNLOAD === "false") {
		throw new Error(
			"yt-dlp tidak ditemukan dan auto-download dinonaktifkan. Set YTDLP_PATH atau aktifkan AETHERIA_YTDLP_AUTO_DOWNLOAD."
		);
	}

	const tmpPath = `${targetPath}.tmp`;
	const errors = [];

	await mkdir(dirname(targetPath), { recursive: true });

	for (const url of getYtDlpDownloadUrls()) {
		try {
			const response = await axios.get(url, {
				headers: {
					"user-agent": "AetheriaBot/0.1 yt-dlp-fetcher",
				},
				responseType: "arraybuffer",
				timeout: 120000,
			});

			writeFileSync(tmpPath, Buffer.from(response.data));
			chmodSync(tmpPath, 0o755);
			await rename(tmpPath, targetPath);

			const check = await checkYtDlpBinary(targetPath);

			if (check.ok) {
				return targetPath;
			}

			errors.push(`${url}: ${check.error}`);
		} catch (error) {
			errors.push(`${url}: ${summarizeYtDlpError(error)}`);
		}
	}

	rmSync(tmpPath, { force: true });
	rmSync(targetPath, { force: true });

	throw new Error(
		`yt-dlp binary downloaded but cannot run. ${errors.slice(-3).join(" ; ")}`
	);
}

async function resolveYtDlpBinary() {
	if (ytDlpResolvedBinary && existsSync(ytDlpResolvedBinary)) {
		return ytDlpResolvedBinary;
	}

	const errors = [];

	for (const candidate of getYtDlpCandidates()) {
		if (ytDlpRejectedBinaries.has(candidate)) {
			continue;
		}

		if (existsSync(candidate) && isExecutable(candidate)) {
			const check = await checkYtDlpBinary(candidate);

			if (check.ok) {
				ytDlpResolvedBinary = candidate;
				return candidate;
			}

			errors.push(`${candidate}: ${check.error}`);
		}
	}

	const systemCheck = await checkYtDlpBinary("yt-dlp");

	if (systemCheck.ok) {
		ytDlpResolvedBinary = "yt-dlp";
		return "yt-dlp";
	}

	errors.push(`yt-dlp: ${systemCheck.error}`);

	ytDlpDownloadPromise ||= downloadYtDlpBinary().finally(() => {
		ytDlpDownloadPromise = null;
	});

	const downloaded = await ytDlpDownloadPromise;

	const downloadedCheck = await checkYtDlpBinary(downloaded);

	if (downloadedCheck.ok) {
		ytDlpResolvedBinary = downloaded;
		return downloaded;
	}

	throw new Error(
		[
			`yt-dlp binary downloaded but cannot run: ${downloaded}`,
			downloadedCheck.error,
			...errors.slice(-3),
		]
			.filter(Boolean)
			.join("\n")
	);
}

async function recoverYtDlpBinary(binary, reason = "runtime failure") {
	ytDlpResolvedBinary = null;
	ytDlpPreferGenericBinary = true;

	if (binary) {
		ytDlpRejectedBinaries.add(binary);
	}

	if (binary && binary === getYtDlpCachePath()) {
		rmSync(binary, { force: true });
	}

	console.warn(
		`[yt-dlp] Invalidating binary after ${reason}; trying fallback binary.`
	);

	return resolveYtDlpBinary();
}

function getCookiesPath() {
	return join(process.cwd(), "cookies.txt");
}

function addCookiesArgs(args) {
	const cookiesPath = getCookiesPath();

	try {
		readFileSync(cookiesPath);
		args.push("--cookies", cookiesPath);
	} catch {
		// cookies.txt is optional. yt-dlp can still resolve many sources.
	}

	return args;
}

function normalizeHttpUrl(input = "") {
	const raw = String(input || "").trim();

	if (!raw) {
		return "";
	}

	try {
		const url = new URL(raw);

		if (!["http:", "https:"].includes(url.protocol)) {
			return "";
		}

		return url.href;
	} catch {
		return "";
	}
}

function normalizeYoutubeLikeUrl(input = "") {
	const raw = String(input || "").trim();

	if (!raw || /\s/.test(raw)) {
		return "";
	}

	const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
	const url = normalizeHttpUrl(withProtocol);

	if (!url) {
		return "";
	}

	return isYoutubeUrl(url) ? url : "";
}

function normalizeSoundCloudLikeUrl(input = "") {
	const raw = String(input || "").trim();

	if (!raw || /\s/.test(raw)) {
		return "";
	}

	const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
	const url = normalizeHttpUrl(withProtocol);

	if (!url) {
		return "";
	}

	return isSoundCloudUrl(url) ? url : "";
}

export function isYoutubeUrl(input = "") {
	try {
		const url = new URL(String(input || "").trim());
		const host = url.hostname.replace(/^www\./i, "").toLowerCase();

		return (
			host === "youtube.com" ||
			host === "m.youtube.com" ||
			host === "music.youtube.com" ||
			host === "youtu.be"
		);
	} catch {
		return false;
	}
}

export function isSoundCloudUrl(input = "") {
	try {
		const url = new URL(String(input || "").trim());
		const host = url.hostname.replace(/^www\./i, "").toLowerCase();

		return host === "soundcloud.com" || host.endsWith(".soundcloud.com");
	} catch {
		return false;
	}
}

function normalizeSearchProvider(provider = "") {
	const value = String(provider || "")
		.trim()
		.toLowerCase();

	if (["sc", "soundcloud"].includes(value)) {
		return "soundcloud";
	}

	return "youtube";
}

export function buildYtDlpStreamTarget(input = "", opts = {}) {
	const raw = String(input || "").trim();
	const httpUrl = normalizeHttpUrl(raw);
	const youtubeLikeUrl = normalizeYoutubeLikeUrl(raw);
	const soundCloudLikeUrl = normalizeSoundCloudLikeUrl(raw);
	const searchProvider = normalizeSearchProvider(opts.searchProvider);

	if (!raw) {
		return "";
	}

	if (httpUrl) {
		return httpUrl;
	}

	if (youtubeLikeUrl) {
		return youtubeLikeUrl;
	}

	if (soundCloudLikeUrl) {
		return soundCloudLikeUrl;
	}

	if (searchProvider === "soundcloud") {
		return `scsearch1:${raw}`;
	}

	return `ytsearch1:${raw}`;
}

export function buildYtDlpStdoutArgs(input = "", opts = {}) {
	const target = buildYtDlpStreamTarget(input, opts);

	if (!target) {
		throw new Error("Query atau URL kosong.");
	}

	return addCookiesArgs([
		"--no-playlist",
		"--no-progress",
		"-f",
		opts.format || DEFAULT_STREAM_FORMAT,
		"-o",
		"-",
		target,
	]);
}

function parseYtDlpJson(stdout = "") {
	const lines = String(stdout || "")
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	const entries = [];

	for (const line of lines) {
		try {
			entries.push(JSON.parse(line));
		} catch {
			// Keep scanning. yt-dlp may emit non-JSON warnings in some builds.
		}
	}

	if (!entries.length) {
		throw new Error("yt-dlp tidak mengembalikan metadata JSON.");
	}

	return entries;
}

function getSelectedStreamUrl(info = {}) {
	if (info.url) {
		return info.url;
	}

	const requestedDownload = info.requested_downloads?.find?.(
		(format) => format?.url
	);
	if (requestedDownload?.url) {
		return requestedDownload.url;
	}

	const requestedFormat = info.requested_formats?.find?.(
		(format) => format?.url
	);
	if (requestedFormat?.url) {
		return requestedFormat.url;
	}

	return "";
}

function normalizeHttpHeaders(headers = {}) {
	return Object.fromEntries(
		Object.entries(headers || {}).filter(
			([key, value]) => key && value !== undefined && value !== null
		)
	);
}

export async function resolveYtDlpAudioStream(input, opts = {}) {
	const target = buildYtDlpStreamTarget(input, opts);

	if (!target) {
		throw new Error("Query atau URL kosong.");
	}

	const args = addCookiesArgs([
		"--no-playlist",
		"--skip-download",
		"--dump-json",
		"--no-warnings",
		"-f",
		opts.format || DEFAULT_STREAM_FORMAT,
		target,
	]);
	const execOptions = {
		maxBuffer:
			Number(process.env.AETHERIA_YTDLP_INFO_MAX_BUFFER) ||
			20 * 1024 * 1024,
		timeout: Number(process.env.AETHERIA_YTDLP_INFO_TIMEOUT_MS) || 120000,
		windowsHide: true,
	};
	let binary = await resolveYtDlpBinary();
	let stdout = "";

	try {
		({ stdout } = await execFilePromise(binary, args, execOptions));
	} catch (error) {
		if (!isYtDlpRuntimeBinaryError(error)) {
			throw error;
		}

		binary = await recoverYtDlpBinary(binary, "metadata extraction error");
		({ stdout } = await execFilePromise(binary, args, execOptions));
	}

	const entries = parseYtDlpJson(stdout);
	const info =
		entries.find((entry) => getSelectedStreamUrl(entry)) || entries[0];
	const streamUrl = getSelectedStreamUrl(info);

	if (!streamUrl) {
		throw new Error(
			"yt-dlp tidak menemukan audio stream yang bisa diputar."
		);
	}

	return {
		duration: info.duration || 0,
		durationString: info.duration_string || "",
		headers: normalizeHttpHeaders(info.http_headers),
		id: info.id || "",
		input: String(input || "").trim(),
		source: "yt-dlp",
		streamUrl,
		thumbnail: info.thumbnail || "",
		title: info.title || "YouTube Audio",
		uploader: info.uploader || info.channel || "",
		webpageUrl: info.webpage_url || info.original_url || "",
	};
}

function getDownloadedMediaFile(tempDir) {
	const fileName = readdirSync(tempDir).find(
		(file) => !file.endsWith(".part") && !file.endsWith(".tmp")
	);

	if (!fileName) {
		throw new Error("yt-dlp selesai tanpa menghasilkan file media.");
	}

	return join(tempDir, fileName);
}

function getVideoMimetype(fileName = "") {
	const ext = String(fileName).split(".").pop()?.toLowerCase();

	if (ext === "webm") {
		return "video/webm";
	}

	if (ext === "mkv") {
		return "video/x-matroska";
	}

	return "video/mp4";
}

/**
 * Download YouTube audio/video with yt-dlp.
 * @param {String} url
 * @param {Object} opts { video?:boolean, cookiesPath?:string }
 * @returns {Promise<{buffer: Buffer, fileName: string}>}
 */
export async function downloadYt(url, opts = {}) {
	const { video = false, title = "youtube" } = opts;
	const cookiesPath = getCookiesPath();

	const format = video
		? "best[ext=mp4][height<=360]/best[height<=360]/best"
		: "bestaudio[ext=m4a]/bestaudio/best";

	const tempDir = mkdtempSync(join(tmpdir(), "aetheria-yt-"));
	const outTemplate = join(tempDir, "media.%(ext)s");
	const binary = await resolveYtDlpBinary();

	const args = [
		"--no-playlist",
		"--js-runtimes",
		"node",
		"-f",
		format,
		"-o",
		outTemplate,
		url,
	];

	try {
		readFileSync(cookiesPath);
		args.unshift("--cookies", cookiesPath);
	} catch {
		console.warn("cookies.txt not found. Proceeding without cookies.");
	}

	console.log("[yt-dlp binary]", binary);

	try {
		await execFilePromise(binary, args, {
			maxBuffer: 30 * 1024 * 1024,
			timeout: Number(process.env.AETHERIA_YTDLP_TIMEOUT_MS) || 300000,
			windowsHide: true,
		});

		const mediaFile = getDownloadedMediaFile(tempDir);
		const mediaBuffer = readFileSync(mediaFile);
		const fileExt = video ? mediaFile.split(".").pop() || "mp4" : "mp3";
		const buffer = video ? mediaBuffer : await to_audio(mediaBuffer, "mp3");

		return {
			buffer,
			mimetype: video ? getVideoMimetype(mediaFile) : "audio/mpeg",
			fileName: `${title.replace(/[\\/:*?"<>|]/g, "").slice(0, 60) || "yt"}.${fileExt}`,
		};
	} finally {
		rmSync(tempDir, { force: true, recursive: true });
	}
}

/**
 * Downloads YouTube video or audio content using ytdown.to service
 * @async
 * @param {string} url - The YouTube video URL to download
 * @param {('video'|'audio')} [type='video'] - The media type to download (video or audio)
 * @returns {Promise<Object>} A promise that resolves to an object containing media information and download URL
 * @throws {Error} If the API returns an error, media type is not found, or metadata is not found
 *
 * @typedef {Object} MediaInfo
 * @property {Object} info - Media information
 * @property {string} info.title - Title of the video
 * @property {string} info.desc - Description of the video
 * @property {string} info.thumbnail - URL of the video thumbnail
 * @property {string} info.views - Number of views
 * @property {string} info.uploader - Name of the uploader
 * @property {string} info.quality - Quality of the media
 * @property {string} info.duration - Duration of the media
 * @property {string} info.extension - File extension
 * @property {string} info.size - File size
 * @property {string} download - Direct download URL for the media
 */
export async function ytdown(url, type = "video") {
	const { data } = await axios.post(
		"https://app.ytdown.to/proxy.php",
		new URLSearchParams({ url }),
		{ headers: { "Content-Type": "application/x-www-form-urlencoded" } }
	);

	const api = data.api;
	if (api?.status == "ERROR") {
		throw new Error(api.message);
	}

	const media = api?.mediaItems?.find(
		(m) => m.type.toLowerCase() === type.toLowerCase()
	);
	if (!media) {
		throw new Error("Media type not found");
	}

	while (true) {
		const { data: res } = await axios.get(media.mediaUrl);

		if (res?.error === "METADATA_NOT_FOUND") {
			throw new Error("Metadata not found");
		}

		if (
			res?.percent === "Completed" &&
			res?.fileUrl !== "In Processing..."
		) {
			return {
				info: {
					title: api.title,
					desc: api.description,
					thumbnail: api.imagePreviewUrl,
					views: api.mediaStats?.viewsCount,
					uploader: api.userInfo?.name,
					quality: media.mediaQuality,
					duration: media.mediaDuration,
					extension: media.mediaExtension,
					size: media.mediaFileSize,
				},
				download: res.fileUrl,
			};
		}

		await delay(5000);
	}
}

/**
 * Download YouTube audio/video via API
 * @param {String} url
 * @param {Object} opts
 * @param {Boolean} opts.video
 * @param {String} opts.videoQuality
 * @param {String} opts.audioFormat
 * @returns {Promise<{ buffer: Buffer, mimetype: string, fileName: string }>}
 */
export async function downloadApiYt(url, opts = {}) {
	const { video = false, title = "youtube" } = opts;

	const result = await ytdown(url, video ? "video" : "audio");

	if (!result?.download) {
		throw new Error("Download link not found");
	}

	const { data } = await axios.get(result.download, {
		responseType: "arraybuffer",
	});

	let buffer = Buffer.from(data);

	if (!video) {
		buffer = await to_audio(buffer, "mp3");
	}

	const safeTitle = (title || result.info.title || "yt")
		.replace(/[\\/:*?"<>|]/g, "")
		.slice(0, 60);

	return {
		buffer,
		mimetype: video ? "video/mp4" : "audio/mpeg",
		fileName: `${safeTitle}.${video ? "mp4" : "mp3"}`,
	};
}

export {
	getYtDlpAssetName,
	getYtDlpDownloadUrl,
	getYtDlpDownloadUrls,
	resolveYtDlpBinary,
};
