import { BRAND_CONFIG } from "#config/brand";

const DEFAULT_WEBSITE_URL =
	process.env.AETHERIA_PUBLIC_URL ||
	process.env.BOT_WEBSITE_URL ||
	"https://aetheria-theta.vercel.app/";

const FEEDBACK_LABELS = {
	bug: "Bug Report",
	feedback: "Feedback",
	lapor: "Laporan",
	saran: "Saran",
	suggest: "Saran",
};

function getPluginCategory(plugin = {}) {
	return String(plugin.category || "general")
		.toLowerCase()
		.trim();
}

function countVisiblePlugins(plugins = []) {
	return plugins.filter((plugin) => !plugin.hidden && !plugin.owner);
}

export function normalizeJidNumber(value) {
	const text = String(value || "");
	const match = text.match(/\d{8,}/);

	return match ? match[0] : "";
}

export function buildWaMeLink(number, prefill = "") {
	const digits = normalizeJidNumber(number);

	if (!digits) {
		return "";
	}

	const query = prefill ? `?text=${encodeURIComponent(prefill)}` : "";

	return `https://wa.me/${digits}${query}`;
}

export function getBotNumber(sock) {
	return normalizeJidNumber(
		process.env.BOT_NUMBER ||
			sock?.user?.id ||
			sock?.user?.jid ||
			sock?.user?.lid
	);
}

export function formatDuration(ms) {
	const totalSeconds = Math.max(0, Math.floor(Number(ms) / 1000));
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const parts = [];

	if (days) {
		parts.push(`${days}d`);
	}
	if (hours) {
		parts.push(`${hours}h`);
	}
	if (minutes) {
		parts.push(`${minutes}m`);
	}
	if (!parts.length) {
		parts.push(`${seconds}s`);
	}

	return parts.join(" ");
}

export function formatBytes(bytes) {
	const value = Number(bytes) || 0;
	const units = ["B", "KB", "MB", "GB"];
	let size = value;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex += 1;
	}

	return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function getBotMode(settings = {}) {
	if (settings.self) {
		return "self";
	}
	if (settings.groupOnly) {
		return "group only";
	}
	if (settings.privateChatOnly) {
		return "private only";
	}

	return "public";
}

export function summarizePluginCategories(plugins = []) {
	const categories = new Map();

	for (const plugin of countVisiblePlugins(plugins)) {
		const category = getPluginCategory(plugin);
		categories.set(category, (categories.get(category) || 0) + 1);
	}

	return [...categories.entries()].sort(([a], [b]) =>
		a.localeCompare(b, "id")
	);
}

export function formatPublicStatus({
	botNumber = "",
	brand = BRAND_CONFIG,
	memory = process.memoryUsage(),
	plugins = [],
	prefix = ".",
	queueStatus = {},
	settings = {},
	uptimeMs = process.uptime() * 1000,
	websiteUrl = DEFAULT_WEBSITE_URL,
} = {}) {
	const visiblePlugins = countVisiblePlugins(plugins);
	const categories = summarizePluginCategories(plugins);
	const botLink = buildWaMeLink(botNumber, `${prefix}rpg`);
	const lines = [
		`🌌 *${brand.name} Status*`,
		"━━━━━━━━━━━━━━━━━━━━",
		brand.description || "WhatsApp bot",
		"",
		`Mode: *${getBotMode(settings)}*`,
		`Uptime: *${formatDuration(uptimeMs)}*`,
		`Memory: *${formatBytes(memory.rss || 0)} RSS / ${formatBytes(memory.heapUsed || 0)} heap*`,
		`Command publik: *${visiblePlugins.length}*`,
		`Kategori: *${categories.length}*`,
		`Queue aktif: *${queueStatus.totalQueues || 0}*`,
		"",
		"*Shortcut*",
		`- ${prefix}help`,
		`- ${prefix}update`,
		`- ${prefix}rpg`,
		`- ${prefix}tavern`,
		`- ${prefix}invite`,
		`- ${prefix}donasi`,
		`- ${prefix}feedback <pesan>`,
	];

	if (botLink) {
		lines.push("", "*Link Bot*", botLink);
	}

	if (websiteUrl) {
		lines.push("", "*Website*", websiteUrl);
	}

	return lines.join("\n");
}

export function formatPublicStatusRichResponse(options = {}) {
	const {
		botNumber = "",
		brand = BRAND_CONFIG,
		memory = process.memoryUsage(),
		plugins = [],
		prefix = ".",
		queueStatus = {},
		settings = {},
		uptimeMs = process.uptime() * 1000,
		websiteUrl = DEFAULT_WEBSITE_URL,
	} = options;
	const visiblePlugins = countVisiblePlugins(plugins);
	const categories = summarizePluginCategories(plugins);
	const botLink = buildWaMeLink(botNumber, `${prefix}rpg`);
	const links = [];

	if (botLink) {
		links.push({
			text: "Buka bot",
			url: botLink,
			title: `${brand.name} WhatsApp`,
			displayName: "WhatsApp",
			sources: [
				{
					displayName: "WhatsApp",
					subtitle: "Mulai RPG",
					url: botLink,
				},
			],
		});
	}

	if (websiteUrl) {
		links.push({
			text: "Buka website",
			url: websiteUrl,
			title: `${brand.name} Website`,
			displayName: "Aetheria Web",
			sources: [
				{
					displayName: "Aetheria Web",
					subtitle: "Dashboard publik",
					url: websiteUrl,
				},
			],
		});
	}

	return {
		disclaimerText: `${brand.name} Status`,
		headerText: `## ${brand.name} Status`,
		contentText: brand.description || "WhatsApp bot",
		title: "Runtime",
		table: [
			["Metric", "Value"],
			["Mode", getBotMode(settings)],
			["Uptime", formatDuration(uptimeMs)],
			[
				"Memory",
				`${formatBytes(memory.rss || 0)} RSS / ${formatBytes(memory.heapUsed || 0)} heap`,
			],
			["Command publik", String(visiblePlugins.length)],
			["Kategori", String(categories.length)],
			["Queue aktif", String(queueStatus.totalQueues || 0)],
		],
		links,
		footerText: [
			"Shortcut:",
			`${prefix}help • ${prefix}update • ${prefix}rpg`,
			`${prefix}tavern • ${prefix}invite • ${prefix}donasi`,
		].join("\n"),
		fallbackText: formatPublicStatus(options),
	};
}

export function formatInviteMessage({
	botNumber = "",
	prefix = ".",
	websiteUrl = DEFAULT_WEBSITE_URL,
} = {}) {
	const botLink = buildWaMeLink(botNumber, `${prefix}rpg`);
	const lines = [
		`🌌 *Main ${BRAND_CONFIG.name} di WhatsApp*`,
		"━━━━━━━━━━━━━━━━━━━━",
		`${BRAND_CONFIG.name} adalah bot RPG WhatsApp dengan karakter, daily, quest, guild, squad, dungeon mini, world boss, pet, achievement, dan update interaktif.`,
		"",
		"*Mulai Cepat*",
		`- ${prefix}rpg`,
		`- ${prefix}mulai`,
		`- ${prefix}guide`,
		`- ${prefix}update`,
		`- ${prefix}donasi`,
		`- ${prefix}invite`,
		"",
		"*Link Bot*",
		botLink || "-",
		"",
		"*Website*",
		websiteUrl,
		"",
		"Forward pesan ini ke teman yang mau coba RPG ringan langsung dari WhatsApp.",
	];

	return lines.join("\n");
}

export function getFeedbackKind(command = "feedback") {
	const key = String(command || "feedback")
		.toLowerCase()
		.trim();

	return FEEDBACK_LABELS[key] ? key : "feedback";
}

export function trimFeedbackText(text, maxLength = 3000) {
	const clean = String(text || "").trim();

	if (clean.length <= maxLength) {
		return clean;
	}

	return `${clean.slice(0, maxLength - 20).trimEnd()}\n...[dipotong]`;
}

export function formatFeedbackReport({
	chatJid = "",
	chatName = "",
	command = "feedback",
	isGroup = false,
	senderJid = "",
	senderName = "",
	text = "",
	timestamp = new Date(),
} = {}) {
	const kind = getFeedbackKind(command);
	const label = FEEDBACK_LABELS[kind] || FEEDBACK_LABELS.feedback;
	const senderNumber = normalizeJidNumber(senderJid);
	const replyLink = buildWaMeLink(senderNumber);
	const lines = [
		`📩 *${label} Aetheria*`,
		"━━━━━━━━━━━━━━━━━━━━",
		`Dari: ${senderName || "-"} (${senderJid || "-"})`,
		`Chat: ${chatName || (isGroup ? "Grup" : "Private")} (${chatJid || "-"})`,
		`Waktu: ${timestamp.toLocaleString("id-ID", {
			timeZone: "Asia/Jakarta",
		})}`,
		"",
		"*Isi*",
		trimFeedbackText(text),
	];

	if (replyLink) {
		lines.push("", "*Balas User*", replyLink);
	}

	return lines.join("\n");
}

export function formatFeedbackAck(command = "feedback", sentCount = 0) {
	const kind = getFeedbackKind(command);
	const label = FEEDBACK_LABELS[kind] || FEEDBACK_LABELS.feedback;

	return [
		`✅ *${label} terkirim*`,
		"Terima kasih. Pesanmu sudah masuk ke owner Aetheria.",
		`Owner tujuan: ${sentCount}`,
	].join("\n");
}

export function formatOwnerOps({
	groupCount = 0,
	groupsBanned = 0,
	memory = process.memoryUsage(),
	ownerCount = 0,
	plugins = [],
	queueStatus = {},
	settings = {},
	uptimeMs = process.uptime() * 1000,
	userCount = 0,
	usersBanned = 0,
	usersPremium = 0,
} = {}) {
	const categories = summarizePluginCategories(plugins);
	const queueRows = (queueStatus.queues || [])
		.slice(0, 5)
		.map((queue) => `- ${queue.jid}: ${queue.count}`)
		.join("\n");

	return [
		"👑 *Aetheria Ops*",
		"━━━━━━━━━━━━━━━━━━━━",
		`Mode: *${getBotMode(settings)}*`,
		`Uptime: *${formatDuration(uptimeMs)}*`,
		`Memory: *${formatBytes(memory.rss || 0)} RSS / ${formatBytes(memory.heapUsed || 0)} heap*`,
		"",
		"*Runtime*",
		`Plugin: ${plugins.length}`,
		`Kategori publik: ${categories.length}`,
		`Queue aktif: ${queueStatus.totalQueues || 0}`,
		`Owner: ${ownerCount}`,
		"",
		"*Database Lokal*",
		`User: ${userCount} (${usersPremium} premium, ${usersBanned} banned)`,
		`Grup: ${groupCount} (${groupsBanned} banned)`,
		"",
		"*Queue Detail*",
		queueRows || "- kosong",
	].join("\n");
}
