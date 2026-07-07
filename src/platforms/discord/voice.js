import print from "#lib/print";
import Spotify from "#lib/scrapers/spotifySearch";
import {
	buildYtDlpStdoutArgs,
	isSoundCloudUrl,
	isYoutubeUrl,
	resolveYtDlpAudioStream,
	resolveYtDlpBinary,
} from "#lib/yt-dlp";
import {
	DISCORD_COLOR,
	DISCORD_ERROR_COLOR,
	DISCORD_SUCCESS_COLOR,
} from "#platforms/discord/format";

const CHAT_INPUT_COMMAND_TYPE = 1;
const STRING_OPTION_TYPE = 3;
const CHANNEL_OPTION_TYPE = 7;
const GUILD_INSTALL_TYPE = 0;
const GUILD_CONTEXT_TYPE = 0;
const GUILD_VOICE_CHANNEL_TYPE = 2;
const GUILD_STAGE_VOICE_CHANNEL_TYPE = 13;
const DESCRIPTION_LIMIT = 3900;
const PLAY_TIMEOUT_MS = 30_000;
const VOICE_IDLE_TIMEOUT_MS =
	Number(process.env.AETHERIA_DISCORD_VOICE_IDLE_TIMEOUT_MS) || 120_000;
const FFMPEG_RECONNECT_ARGS = [
	"-reconnect",
	"1",
	"-reconnect_streamed",
	"1",
	"-reconnect_delay_max",
	"5",
];

const voiceSessions = new Map();
let spotifyClient = null;

export const DISCORD_VOICE_COMMAND_NAMES = ["play", "stop", "nowplaying"];

export const DISCORD_VOICE_COMMANDS = [
	{
		contexts: [GUILD_CONTEXT_TYPE],
		description:
			"Putar lagu, YouTube, Spotify, SoundCloud, atau radio stream.",
		dm_permission: false,
		integration_types: [GUILD_INSTALL_TYPE],
		name: "play",
		options: [
			{
				description:
					"Judul, URL, atau prefix spotify:/soundcloud:/youtube:.",
				name: "query",
				required: true,
				type: STRING_OPTION_TYPE,
			},
			{
				description: "Judul opsional untuk now playing.",
				name: "title",
				required: false,
				type: STRING_OPTION_TYPE,
			},
			{
				channel_types: [
					GUILD_VOICE_CHANNEL_TYPE,
					GUILD_STAGE_VOICE_CHANNEL_TYPE,
				],
				description:
					"Voice channel tujuan jika posisi voice kamu tidak terbaca bot.",
				name: "channel",
				required: false,
				type: CHANNEL_OPTION_TYPE,
			},
		],
		type: CHAT_INPUT_COMMAND_TYPE,
	},
	{
		contexts: [GUILD_CONTEXT_TYPE],
		description: "Hentikan stream dan keluar dari voice channel.",
		dm_permission: false,
		integration_types: [GUILD_INSTALL_TYPE],
		name: "stop",
		type: CHAT_INPUT_COMMAND_TYPE,
	},
	{
		contexts: [GUILD_CONTEXT_TYPE],
		description: "Lihat stream Discord yang sedang berjalan.",
		dm_permission: false,
		integration_types: [GUILD_INSTALL_TYPE],
		name: "nowplaying",
		type: CHAT_INPUT_COMMAND_TYPE,
	},
];

function truncate(value = "", limit = DESCRIPTION_LIMIT) {
	const text = String(value || "").trim();

	if (text.length <= limit) {
		return text || "-";
	}

	return `${text.slice(0, limit - 20).trimEnd()}\n...`;
}

function voicePayload({
	color = DISCORD_COLOR,
	description = "",
	ephemeral = false,
	fields = [],
	title = "Aetheria Voice",
} = {}) {
	return {
		embeds: [
			{
				color,
				description: truncate(description),
				fields,
				title,
			},
		],
		ephemeral,
	};
}

function displayName(interaction = {}) {
	return (
		interaction.member?.displayName ||
		interaction.user?.globalName ||
		interaction.user?.username ||
		"Discord User"
	);
}

export function normalizeDiscordStreamUrl(input = "") {
	const raw = String(input || "").trim();

	if (!raw || raw.length > 2000) {
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

function getOptionString(interaction, name) {
	try {
		return String(interaction.options.getString(name) || "").trim();
	} catch {
		return "";
	}
}

function getOptionChannel(interaction, name) {
	try {
		return interaction.options.getChannel(name) || null;
	} catch {
		return null;
	}
}

function getPlayQuery(interaction) {
	return (
		getOptionString(interaction, "query") ||
		getOptionString(interaction, "url")
	);
}

function getSpotifyClient() {
	spotifyClient ||= new Spotify();

	return spotifyClient;
}

function getUrl(input = "") {
	try {
		return new URL(String(input || "").trim());
	} catch {
		return null;
	}
}

export function isSpotifyUrl(input = "") {
	const url = getUrl(input);

	if (!url) {
		return false;
	}

	const host = url.hostname.replace(/^www\./i, "").toLowerCase();

	return host === "spotify.com" || host.endsWith(".spotify.com");
}

export function getSpotifyInputType(input = "") {
	const raw = String(input || "").trim();
	const uriMatch = raw.match(/^spotify:(track|album|playlist|artist):/i);

	if (uriMatch) {
		return uriMatch[1].toLowerCase();
	}

	const url = getUrl(raw);
	const parts = url?.pathname?.split("/")?.filter(Boolean) || [];
	const type = parts.find((part) =>
		["track", "album", "playlist", "artist"].includes(part)
	);

	return isSpotifyUrl(raw) && type ? type : "";
}

export function parseDiscordPlayProviderInput(input = "") {
	const raw = String(input || "").trim();

	if (!raw) {
		return {
			explicit: false,
			provider: "youtube",
			query: "",
		};
	}

	if (/^spotify:(track|album|playlist|artist):/i.test(raw)) {
		return {
			explicit: true,
			provider: "spotify",
			query: raw,
		};
	}

	const prefixed = raw.match(
		/^(youtube|yt|soundcloud|sc|spotify|sp)\s*:\s*(.+)$/i
	);

	if (prefixed) {
		const alias = prefixed[1].toLowerCase();
		const provider =
			alias === "sc"
				? "soundcloud"
				: alias === "sp"
					? "spotify"
					: alias === "yt"
						? "youtube"
						: alias;

		return {
			explicit: true,
			provider,
			query: prefixed[2].trim(),
		};
	}

	if (isSpotifyUrl(raw)) {
		return {
			explicit: true,
			provider: "spotify",
			query: raw,
		};
	}

	if (isSoundCloudUrl(raw)) {
		return {
			explicit: true,
			provider: "soundcloud",
			query: raw,
		};
	}

	return {
		explicit: false,
		provider: "youtube",
		query: raw,
	};
}

function getSpotifyArtistNames(track = {}) {
	return (track.artists || []).map((artist) => artist?.name).filter(Boolean);
}

export function buildSpotifyPlaybackSearch(track = {}) {
	const artists = getSpotifyArtistNames(track).join(" ");
	const title = String(track.name || "").trim();

	return [artists, title, "audio"].filter(Boolean).join(" - ");
}

function formatSpotifyTrackTitle(track = {}) {
	const artists = getSpotifyArtistNames(track).join(", ");
	const title = String(track.name || "").trim();

	return [artists, title].filter(Boolean).join(" - ") || "Spotify Track";
}

async function resolveSpotifyTrack(input = "") {
	const spotify = getSpotifyClient();
	const type = getSpotifyInputType(input);

	if (type === "track") {
		return spotify.track(input);
	}

	if (type === "album") {
		const album = await spotify.album(input, { limit: 1 });
		const track = album?.tracks?.[0] || null;

		return track
			? {
					...track,
					album: {
						name: album.name,
						url: album.url,
					},
					artists: track.artists?.length
						? track.artists
						: album.artists,
				}
			: null;
	}

	if (type === "playlist") {
		const playlist = await spotify.playlist(input, { limit: 1 });
		return playlist?.tracks?.[0] || null;
	}

	if (type === "artist") {
		const artist = await spotify.artist(input);
		const name = artist?.name || input;

		return spotify.searchFirstTrack(name);
	}

	return spotify.searchFirstTrack(input);
}

async function resolveSpotifyPlaySource(input = "") {
	const track = await resolveSpotifyTrack(input);

	if (!track?.name) {
		throw new Error("Spotify tidak menemukan track yang bisa diputar.");
	}

	const searchQuery = buildSpotifyPlaybackSearch(track);
	const searchProvider =
		process.env.AETHERIA_SPOTIFY_AUDIO_PROVIDER === "soundcloud"
			? "soundcloud"
			: "youtube";
	const resolved = await resolveYtDlpAudioStream(searchQuery, {
		searchProvider,
	});

	return {
		...resolved,
		displayUrl: track.url || resolved.webpageUrl || resolved.input || "",
		input: searchQuery,
		playbackTarget: searchQuery,
		provider: "spotify",
		requestedInput: input,
		searchProvider,
		source: "yt-dlp",
		title: formatSpotifyTrackTitle(track),
		uploader:
			getSpotifyArtistNames(track).join(", ") ||
			resolved.uploader ||
			"Spotify",
		webpageUrl: track.url || resolved.webpageUrl || "",
	};
}

async function resolveSoundCloudPlaySource(input = "") {
	const resolved = await resolveYtDlpAudioStream(input, {
		searchProvider: "soundcloud",
	});

	return {
		...resolved,
		displayUrl: resolved.webpageUrl || resolved.input || "",
		provider: "soundcloud",
		searchProvider: "soundcloud",
		source: "yt-dlp",
	};
}

async function resolveYoutubePlaySource(input = "") {
	const resolved = await resolveYtDlpAudioStream(input, {
		searchProvider: "youtube",
	});

	return {
		...resolved,
		displayUrl: resolved.webpageUrl || resolved.input || "",
		provider: "youtube",
		searchProvider: "youtube",
		source: "yt-dlp",
	};
}

export function shouldUseYtDlpForDiscordPlay(input = "") {
	const parsed = parseDiscordPlayProviderInput(input);

	if (["spotify", "soundcloud"].includes(parsed.provider)) {
		return true;
	}

	const url = normalizeDiscordStreamUrl(input);

	return !url || isYoutubeUrl(url) || isSoundCloudUrl(url);
}

async function resolveDiscordPlaySource(input = "") {
	const raw = String(input || "").trim();

	if (!raw) {
		throw new Error("Query kosong.");
	}

	const parsed = parseDiscordPlayProviderInput(raw);
	const directUrl = normalizeDiscordStreamUrl(parsed.query);

	if (directUrl && !shouldUseYtDlpForDiscordPlay(directUrl)) {
		return {
			displayUrl: directUrl,
			headers: {},
			input: parsed.query,
			provider: "direct",
			source: "direct",
			streamUrl: directUrl,
			title: new URL(directUrl).hostname || "Audio Stream",
			webpageUrl: directUrl,
		};
	}

	if (parsed.provider === "spotify") {
		return resolveSpotifyPlaySource(parsed.query);
	}

	if (parsed.provider === "soundcloud") {
		return resolveSoundCloudPlaySource(parsed.query);
	}

	return resolveYoutubePlaySource(parsed.query);
}

function streamTitle(interaction, source) {
	const title = String(interaction.options.getString("title") || "").trim();

	if (title) {
		return title.slice(0, 120);
	}

	return source.title || "Audio Stream";
}

async function loadVoiceDeps() {
	const [voice, ffmpegModule, childProcess] = await Promise.all([
		import("@discordjs/voice"),
		import("ffmpeg-static"),
		import("node:child_process"),
	]);
	const ffmpegPath =
		ffmpegModule.default || ffmpegModule.path || String(ffmpegModule);

	if (!ffmpegPath) {
		throw new Error("ffmpeg-static tidak menemukan binary ffmpeg.");
	}

	return {
		...voice,
		ffmpegPath,
		spawn: childProcess.spawn,
	};
}

function collectStderr(session, chunk) {
	const text = String(chunk || "").trim();

	if (!text) {
		return;
	}

	session.stderr.push(text);

	if (session.stderr.length > 8) {
		session.stderr.shift();
	}
}

function collectYtDlpStderr(session, chunk) {
	const text = String(chunk || "").trim();

	if (!text) {
		return;
	}

	session.ytdlpStderr.push(text);

	if (session.ytdlpStderr.length > 8) {
		session.ytdlpStderr.shift();
	}
}

function clearIdleTimer(session) {
	if (!session?.idleTimer) {
		return;
	}

	clearTimeout(session.idleTimer);
	session.idleTimer = null;
}

function cleanupAudioPipeline(session, signal = "SIGKILL") {
	try {
		if (session.ffmpeg && !session.ffmpeg.killed) {
			session.ffmpeg.kill(signal);
		}
	} catch (error) {
		print.debug("[Discord Voice] ffmpeg kill failed:", error);
	}

	try {
		if (session.ytdlp && !session.ytdlp.killed) {
			session.ytdlp.kill(signal);
		}
	} catch (error) {
		print.debug("[Discord Voice] yt-dlp kill failed:", error);
	}

	session.ffmpeg = null;
	session.ytdlp = null;
}

function stopSession(guildId, reason = "stop") {
	const session = voiceSessions.get(guildId);

	if (!session) {
		return null;
	}

	voiceSessions.delete(guildId);
	session.stopping = true;
	clearIdleTimer(session);

	try {
		session.player?.stop?.(true);
	} catch (error) {
		print.debug("[Discord Voice] Player stop failed:", error);
	}

	cleanupAudioPipeline(session);

	try {
		session.connection?.destroy?.();
	} catch (error) {
		print.debug("[Discord Voice] Connection destroy failed:", error);
	}

	print.debug(
		`[Discord Voice] Session stopped for guild ${guildId}: ${reason}`
	);
	return session;
}

export function stopAllDiscordVoiceSessions(reason = "shutdown") {
	for (const guildId of [...voiceSessions.keys()]) {
		stopSession(guildId, reason);
	}
}

function buildFfmpegHeaderArgs(headers = {}) {
	const entries = Object.entries(headers || {}).filter(
		([key, value]) => key && value
	);
	const userAgent = entries.find(
		([key]) => key.toLowerCase() === "user-agent"
	)?.[1];
	const rawHeaders = entries
		.filter(([key]) => key.toLowerCase() !== "user-agent")
		.map(([key, value]) => `${key}: ${value}`)
		.join("\r\n");
	const args = [];

	if (userAgent) {
		args.push("-user_agent", String(userAgent));
	}

	if (rawHeaders) {
		args.push("-headers", `${rawHeaders}\r\n`);
	}

	return args;
}

function buildFfmpegArgs(url, { headers = {}, reconnect = true } = {}) {
	return [
		"-hide_banner",
		"-loglevel",
		"error",
		...(reconnect ? FFMPEG_RECONNECT_ARGS : []),
		...buildFfmpegHeaderArgs(headers),
		"-i",
		url,
		"-vn",
		"-ac",
		"2",
		"-ar",
		"48000",
		"-c:a",
		"libopus",
		"-b:a",
		"96k",
		"-f",
		"ogg",
		"pipe:1",
	];
}

function buildYtDlpPipeArgs(source = {}) {
	return buildYtDlpStdoutArgs(
		source.playbackTarget ||
			source.input ||
			source.webpageUrl ||
			source.displayUrl,
		{
			searchProvider: source.searchProvider || source.provider,
		}
	);
}

async function spawnAudioPipeline(deps, source, session) {
	if (source.source !== "yt-dlp") {
		const ffmpeg = deps.spawn(
			deps.ffmpegPath,
			buildFfmpegArgs(source.streamUrl, { headers: source.headers }),
			{
				stdio: ["ignore", "pipe", "pipe"],
			}
		);

		return { ffmpeg, ytdlp: null };
	}

	const ytdlpBinary = await resolveYtDlpBinary();
	const ytdlp = deps.spawn(ytdlpBinary, buildYtDlpPipeArgs(source), {
		stdio: ["ignore", "pipe", "pipe"],
	});
	const ffmpeg = deps.spawn(
		deps.ffmpegPath,
		buildFfmpegArgs("pipe:0", { reconnect: false }),
		{
			stdio: ["pipe", "pipe", "pipe"],
		}
	);

	session.ytdlpBinary = ytdlpBinary;
	ytdlp.stdout?.pipe(ffmpeg.stdin);
	ytdlp.stdout?.on("error", (error) => {
		print.debug("[Discord Voice] yt-dlp stdout pipe failed:", error);
	});
	ffmpeg.stdin?.on("error", (error) => {
		print.debug("[Discord Voice] ffmpeg stdin pipe failed:", error);
	});

	return { ffmpeg, ytdlp };
}

async function getInteractionGuild(interaction) {
	if (!interaction.guildId) {
		return null;
	}

	if (interaction.guild) {
		return interaction.guild;
	}

	try {
		return (
			(await interaction.client?.guilds?.fetch?.(interaction.guildId)) ||
			null
		);
	} catch (error) {
		print.warn("[Discord Voice] Failed fetching guild:", error);
		return null;
	}
}

function getClientGuilds(interaction) {
	return [...(interaction.client?.guilds?.cache?.values?.() || [])].filter(
		Boolean
	);
}

async function getVoiceChannel(interaction, guild) {
	const selectedChannel = getOptionChannel(interaction, "channel");

	if (selectedChannel) {
		if (
			!guild?.id ||
			!selectedChannel.guildId ||
			selectedChannel.guildId === guild.id
		) {
			return selectedChannel;
		}
	}

	if (
		(!interaction.guildId || interaction.guildId === guild?.id) &&
		interaction.member?.voice?.channel
	) {
		return interaction.member.voice.channel;
	}

	const cachedChannel = guild?.voiceStates?.cache?.get?.(
		interaction.user?.id
	)?.channel;

	if (cachedChannel) {
		return cachedChannel;
	}

	try {
		const fetchedVoiceState = await guild?.voiceStates?.fetch?.(
			interaction.user?.id,
			{
				cache: true,
				force: true,
			}
		);

		if (fetchedVoiceState?.channel) {
			return fetchedVoiceState.channel;
		}
	} catch (error) {
		print.debug("[Discord Voice] Failed fetching live voice state:", error);
	}

	try {
		const member =
			guild?.members?.cache?.get?.(interaction.user?.id) ||
			(await guild?.members?.fetch?.(interaction.user?.id));

		return member?.voice?.channel || null;
	} catch (error) {
		print.warn(
			"[Discord Voice] Failed resolving member voice state:",
			error
		);
		return null;
	}
}

async function findSharedVoiceContext(interaction) {
	if (!interaction.user?.id) {
		return null;
	}

	for (const guild of getClientGuilds(interaction)) {
		const channel = await getVoiceChannel(interaction, guild);

		if (channel) {
			return {
				channel,
				guild,
				guildId: guild.id,
				inferred: true,
			};
		}
	}

	return null;
}

function logVoiceContextFailure(interaction, reason = "unknown") {
	print.warn("[Discord Voice] Context resolution failed:", {
		clientGuildCount: interaction.client?.guilds?.cache?.size || 0,
		command: interaction.commandName,
		guildId: interaction.guildId || "",
		reason,
		selectedChannelId: getOptionChannel(interaction, "channel")?.id || "",
		userId: interaction.user?.id || "",
	});
}

async function resolveVoiceContext(interaction) {
	const guild = await getInteractionGuild(interaction);

	if (guild) {
		return {
			channel: await getVoiceChannel(interaction, guild),
			guild,
			guildId: guild.id || interaction.guildId,
			inferred: false,
		};
	}

	return findSharedVoiceContext(interaction);
}

async function resolveSessionGuildId(interaction) {
	if (interaction.guildId) {
		return interaction.guildId;
	}

	const voiceContext = await resolveVoiceContext(interaction);

	return voiceContext?.guildId || "";
}

function serverRequiredPayload() {
	return voicePayload({
		color: DISCORD_ERROR_COLOR,
		description:
			"Aetheria belum bisa menemukan server dan voice channel kamu. Jalankan `/play` dari text channel server, atau pastikan bot ada di server yang sama dan kamu sedang join voice channel.",
		ephemeral: true,
		title: "Server Diperlukan",
	});
}

function missingVoiceChannelPayload() {
	return voicePayload({
		color: DISCORD_ERROR_COLOR,
		description:
			"Masuk voice channel dulu, lalu jalankan `/play query:<judul atau url>` dari server yang sama.",
		ephemeral: true,
		title: "Voice Channel Belum Ada",
	});
}

function invalidQueryPayload(message = "") {
	return voicePayload({
		color: DISCORD_ERROR_COLOR,
		description:
			message ||
			"Query tidak valid. Gunakan judul lagu, prefix `spotify:`/`soundcloud:`/`youtube:`, URL musik, atau direct `http://`/`https://` audio/radio stream.",
		ephemeral: true,
		title: "Query Play Tidak Valid",
	});
}

function formatTrackValue(session) {
	const track = getSessionTrack(session);
	const title = truncate(track.title || "Audio Stream", 180);
	const url = String(track.displayUrl || "").trim();

	if (!url || url.length > 500) {
		return title;
	}

	return `[${title}](${url})`;
}

function formatSourceLabel(session = {}) {
	const track = session.current || session;

	switch (track.provider || track.source) {
		case "spotify":
			return "Spotify metadata + audio search";
		case "soundcloud":
			return "SoundCloud";
		case "youtube":
		case "yt-dlp":
			return "YouTube/search";
		case "direct":
			return "Direct stream URL";
		default:
			return "Audio stream";
	}
}

function buildVoiceTrack(interaction, source, query) {
	return {
		displayUrl: source.displayUrl || source.webpageUrl || "",
		headers: source.headers || {},
		input: source.input || query,
		playbackTarget: source.playbackTarget || source.input || "",
		provider: source.provider || source.source || "stream",
		query,
		requestedBy: displayName(interaction),
		searchProvider: source.searchProvider || source.provider || "",
		source: source.source || "stream",
		streamUrl: source.streamUrl,
		title: streamTitle(interaction, source),
		uploader: source.uploader || "",
		webpageUrl: source.webpageUrl || "",
	};
}

function getSessionTrack(session = {}) {
	return session.current || session;
}

function getQueueSize(session = {}) {
	return Array.isArray(session.queue) ? session.queue.length : 0;
}

function formatQueuePosition(session = {}) {
	const size = getQueueSize(session);

	return size > 0 ? `${size} lagu menunggu` : "Queue kosong";
}

function scheduleIdleLeave(guildId, session) {
	clearIdleTimer(session);

	if (VOICE_IDLE_TIMEOUT_MS <= 0 || voiceSessions.get(guildId) !== session) {
		return;
	}

	session.idleTimer = setTimeout(() => {
		if (
			voiceSessions.get(guildId) === session &&
			!session.current &&
			getQueueSize(session) === 0
		) {
			stopSession(guildId, "idle_timeout");
		}
	}, VOICE_IDLE_TIMEOUT_MS);
}

function applyTrackToSession(session, track) {
	session.current = track;
	session.displayUrl = track.displayUrl || track.webpageUrl || "";
	session.playbackTarget = track.playbackTarget || track.input || "";
	session.provider = track.provider || track.source || "stream";
	session.query = track.query;
	session.requestedBy = track.requestedBy;
	session.source = track.source || "stream";
	session.startedAt = Date.now();
	session.streamUrl = track.streamUrl;
	session.title = track.title;
	session.uploader = track.uploader || "";
}

function resetTrackDiagnostics(session) {
	session.ffmpegExit = null;
	session.stderr = [];
	session.ytdlpExit = null;
	session.ytdlpStderr = [];
}

function buildPlaybackErrorDescription(session, error) {
	const stderr = session.stderr?.join("\n") || "";
	const ytdlpStderr = session.ytdlpStderr?.join("\n") || "";
	const ffmpegExit = session.ffmpegExit
		? `ffmpeg exit: code=${session.ffmpegExit.code ?? "-"} signal=${session.ffmpegExit.signal ?? "-"}`
		: "";
	const ytdlpExit = session.ytdlpExit
		? `yt-dlp exit: code=${session.ytdlpExit.code ?? "-"} signal=${session.ytdlpExit.signal ?? "-"}`
		: "";

	return [
		"Gagal memulai stream.",
		error?.message ? `Error: ${error.message}` : "",
		ffmpegExit,
		ytdlpExit,
		stderr ? `ffmpeg: ${stderr}` : "",
		ytdlpStderr ? `yt-dlp: ${ytdlpStderr}` : "",
	]
		.filter(Boolean)
		.join("\n");
}

function attachPipelineHandlers(guildId, session) {
	session.ffmpeg.stderr?.on("data", (chunk) => collectStderr(session, chunk));
	session.ffmpeg.on("error", (error) => {
		print.error("[Discord Voice] ffmpeg failed:", error);
		if (voiceSessions.get(guildId) === session) {
			session.pipelineFailed = true;
			session.player?.stop?.(true);
		}
	});
	session.ffmpeg.on("close", (code, signal) => {
		session.ffmpegExit = { code, signal };

		if (voiceSessions.get(guildId) !== session) {
			return;
		}

		if (code !== 0 && signal !== "SIGKILL") {
			session.pipelineFailed = true;
			print.warn("[Discord Voice] ffmpeg closed:", {
				code,
				signal,
				stderr: session.stderr.slice(-3),
			});
			session.player?.stop?.(true);
		}
	});

	if (!session.ytdlp) {
		return;
	}

	session.ytdlp.stderr?.on("data", (chunk) =>
		collectYtDlpStderr(session, chunk)
	);
	session.ytdlp.on("error", (error) => {
		print.error("[Discord Voice] yt-dlp failed:", error);
		if (voiceSessions.get(guildId) === session) {
			session.pipelineFailed = true;
			session.player?.stop?.(true);
		}
	});
	session.ytdlp.on("close", (code, signal) => {
		session.ytdlpExit = { code, signal };

		if (voiceSessions.get(guildId) !== session) {
			return;
		}

		if (code !== 0 && signal !== "SIGKILL") {
			session.pipelineFailed = true;
			print.warn("[Discord Voice] yt-dlp closed:", {
				code,
				signal,
				stderr: session.ytdlpStderr.slice(-3),
			});
			session.player?.stop?.(true);
		}
	});
}

async function playTrack(guildId, session, track) {
	const {
		AudioPlayerStatus,
		StreamType,
		VoiceConnectionStatus,
		createAudioResource,
		entersState,
	} = session.deps;

	if (voiceSessions.get(guildId) !== session) {
		return;
	}

	clearIdleTimer(session);
	cleanupAudioPipeline(session);
	resetTrackDiagnostics(session);
	applyTrackToSession(session, track);
	session.pipelineFailed = false;
	session.playing = true;

	await entersState(
		session.connection,
		VoiceConnectionStatus.Ready,
		PLAY_TIMEOUT_MS
	);

	const pipeline = await spawnAudioPipeline(session.deps, track, session);
	session.ffmpeg = pipeline.ffmpeg;
	session.ytdlp = pipeline.ytdlp;
	attachPipelineHandlers(guildId, session);

	const resource = createAudioResource(session.ffmpeg.stdout, {
		inputType: StreamType.OggOpus,
		metadata: {
			title: track.title,
			url: track.displayUrl || track.streamUrl,
		},
	});

	session.connection.subscribe(session.player);
	session.player.play(resource);
	await entersState(
		session.player,
		AudioPlayerStatus.Playing,
		PLAY_TIMEOUT_MS
	);
}

async function playNextQueued(guildId, session) {
	if (voiceSessions.get(guildId) !== session || session.playing) {
		return;
	}

	const nextTrack = session.queue.shift();

	if (!nextTrack) {
		session.current = null;
		scheduleIdleLeave(guildId, session);
		return;
	}

	try {
		await playTrack(guildId, session, nextTrack);
	} catch (error) {
		print.error("[Discord Voice] Failed playing queued track:", error);
		session.playing = false;
		session.current = null;
		cleanupAudioPipeline(session);

		if (voiceSessions.get(guildId) === session) {
			await playNextQueued(guildId, session);
		}
	}
}

function queuedPayload(session, track) {
	return voicePayload({
		color: DISCORD_SUCCESS_COLOR,
		description: `Ditambahkan ke queue voice **${session.channelName}**.`,
		fields: [
			{
				inline: false,
				name: "Queued",
				value: formatTrackValue(track),
			},
			{
				inline: true,
				name: "Posisi",
				value: String(getQueueSize(session)),
			},
			{
				inline: true,
				name: "Source",
				value: formatSourceLabel(track),
			},
		],
		title: "Masuk Queue",
	});
}

function playbackStartedPayload(session) {
	return voicePayload({
		color: DISCORD_SUCCESS_COLOR,
		description: `Streaming di voice channel **${session.channelName}**.`,
		fields: [
			{
				inline: false,
				name: "Now Playing",
				value: formatTrackValue(session),
			},
			{
				inline: true,
				name: "Source",
				value: formatSourceLabel(session),
			},
			{
				inline: true,
				name: "Queue",
				value: formatQueuePosition(session),
			},
			{
				inline: true,
				name: "Requested by",
				value: getSessionTrack(session).requestedBy,
			},
		],
		title: "Play Stream Dimulai",
	});
}

async function handlePlay(interaction) {
	const query = getPlayQuery(interaction);

	if (!query) {
		return invalidQueryPayload();
	}

	const voiceContext = await resolveVoiceContext(interaction);

	if (!voiceContext?.guild || !voiceContext.guildId) {
		logVoiceContextFailure(interaction, "missing_guild");
		return serverRequiredPayload();
	}

	const { channel, guild, guildId } = voiceContext;

	if (!channel) {
		logVoiceContextFailure(interaction, "missing_voice_channel");
		return missingVoiceChannelPayload();
	}

	if (channel.joinable === false || channel.speakable === false) {
		return voicePayload({
			color: DISCORD_ERROR_COLOR,
			description:
				"Aetheria tidak punya izin connect/speak di voice channel itu. Cek permission bot atau invite ulang dengan permission voice.",
			ephemeral: true,
			title: "Izin Voice Kurang",
		});
	}

	let source;

	try {
		source = await resolveDiscordPlaySource(query);
	} catch (error) {
		return invalidQueryPayload(
			[
				"Gagal mencari atau resolve audio stream.",
				error.message ? `Error: ${error.message}` : "",
			]
				.filter(Boolean)
				.join("\n")
		);
	}

	const track = buildVoiceTrack(interaction, source, query);
	const existingSession = voiceSessions.get(guildId);

	if (existingSession) {
		clearIdleTimer(existingSession);
		existingSession.queue.push(track);

		if (!existingSession.playing && !existingSession.current) {
			void playNextQueued(guildId, existingSession);
		}

		return queuedPayload(existingSession, track);
	}

	const deps = await loadVoiceDeps();
	const {
		NoSubscriberBehavior,
		VoiceConnectionStatus,
		createAudioPlayer,
		joinVoiceChannel,
	} = deps;

	const connection = joinVoiceChannel({
		adapterCreator: guild.voiceAdapterCreator,
		channelId: channel.id,
		guildId,
		selfDeaf: true,
	});
	const player = createAudioPlayer({
		behaviors: {
			noSubscriber: NoSubscriberBehavior.Play,
		},
	});
	const session = {
		channelId: channel.id,
		channelName: channel.name,
		connection,
		current: null,
		deps,
		displayUrl: "",
		ffmpeg: null,
		ffmpegExit: null,
		idleTimer: null,
		pipelineFailed: false,
		player,
		playbackTarget: "",
		playing: false,
		provider: "",
		query: "",
		queue: [],
		requestedBy: "",
		source: "",
		startedAt: 0,
		stderr: [],
		stopping: false,
		streamUrl: "",
		title: "",
		uploader: "",
		ytdlp: null,
		ytdlpExit: null,
		ytdlpStderr: [],
	};

	voiceSessions.set(guildId, session);
	player.on(deps.AudioPlayerStatus.Idle, () => {
		if (voiceSessions.get(guildId) !== session || session.stopping) {
			return;
		}

		cleanupAudioPipeline(session);
		session.playing = false;
		session.current = null;
		void playNextQueued(guildId, session);
	});
	player.on("error", (error) => {
		print.error("[Discord Voice] Player error:", error);
		if (voiceSessions.get(guildId) === session) {
			session.pipelineFailed = true;
			session.player?.stop?.(true);
		}
	});
	connection.on(VoiceConnectionStatus.Disconnected, async () => {
		try {
			await Promise.race([
				deps.entersState(
					connection,
					VoiceConnectionStatus.Signalling,
					5_000
				),
				deps.entersState(
					connection,
					VoiceConnectionStatus.Connecting,
					5_000
				),
			]);
		} catch {
			if (voiceSessions.get(guildId) === session) {
				stopSession(guildId, "disconnected");
			}
		}
	});

	try {
		await playTrack(guildId, session, track);
	} catch (error) {
		const description = buildPlaybackErrorDescription(session, error);
		stopSession(guildId, "play_failed");

		return voicePayload({
			color: DISCORD_ERROR_COLOR,
			description,
			ephemeral: true,
			title: "Play Stream Gagal",
		});
	}

	return playbackStartedPayload(session);
}

async function handleStop(interaction) {
	const guildId = await resolveSessionGuildId(interaction);

	if (!guildId) {
		return serverRequiredPayload();
	}

	const session = stopSession(guildId, "slash_stop");

	if (!session) {
		return voicePayload({
			description: "Tidak ada stream aktif di server ini.",
			ephemeral: true,
			title: "Tidak Ada Stream",
		});
	}

	const stoppedTrack = getSessionTrack(session);

	return voicePayload({
		color: DISCORD_SUCCESS_COLOR,
		description: `Stream **${stoppedTrack.title || "Audio Stream"}** dihentikan.`,
		title: "Stream Dihentikan",
	});
}

async function handleNowPlaying(interaction) {
	const guildId = await resolveSessionGuildId(interaction);
	const session = guildId ? voiceSessions.get(guildId) : null;

	if (!session) {
		return voicePayload({
			description: "Tidak ada stream aktif di server ini.",
			ephemeral: true,
			title: "Tidak Ada Stream",
		});
	}

	const track = getSessionTrack(session);
	const elapsedSeconds = Math.max(
		0,
		Math.floor((Date.now() - session.startedAt) / 1000)
	);
	const minutes = Math.floor(elapsedSeconds / 60);
	const seconds = String(elapsedSeconds % 60).padStart(2, "0");

	return voicePayload({
		color: DISCORD_COLOR,
		description: `Sedang streaming di **${session.channelName}**.`,
		fields: [
			{
				inline: false,
				name: "Now Playing",
				value: session.current
					? formatTrackValue(track)
					: "Belum ada lagu aktif.",
			},
			...(track.uploader
				? [
						{
							inline: true,
							name: "Channel",
							value: truncate(track.uploader, 120),
						},
					]
				: []),
			{
				inline: true,
				name: "Durasi",
				value: `${minutes}:${seconds}`,
			},
			{
				inline: true,
				name: "Queue",
				value: formatQueuePosition(session),
			},
			{
				inline: true,
				name: "Requested by",
				value: track.requestedBy || "-",
			},
		],
		title: "Now Playing",
	});
}

export function isDiscordVoiceCommand(commandName = "") {
	return DISCORD_VOICE_COMMAND_NAMES.includes(commandName);
}

export async function handleDiscordVoiceCommand(interaction) {
	if (!isDiscordVoiceCommand(interaction.commandName)) {
		return null;
	}

	if (interaction.commandName === "play") {
		return handlePlay(interaction);
	}

	if (interaction.commandName === "stop") {
		return handleStop(interaction);
	}

	if (interaction.commandName === "nowplaying") {
		return handleNowPlaying(interaction);
	}

	return null;
}
