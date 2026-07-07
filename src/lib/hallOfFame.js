import { BRAND_CONFIG } from "#config/brand";
import { buildWaMeLink } from "#lib/community";
import { SettingsModel } from "#lib/database/index";
import print from "#lib/print";
import { getLeaderboard } from "#lib/rpg";
import { DEFAULT_NEWSLETTER_JID } from "#lib/updates";

const DAY_MS = 24 * 60 * 60 * 1000;
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const DEFAULT_SEND_DAY = 0;
const DEFAULT_SEND_HOUR = 20;
const DEFAULT_SEND_WINDOW_HOURS = 4;
const DEFAULT_PREFIX = ".";

const DAY_NAMES = [
	"Minggu",
	"Senin",
	"Selasa",
	"Rabu",
	"Kamis",
	"Jumat",
	"Sabtu",
];
const MONTH_NAMES = [
	"Januari",
	"Februari",
	"Maret",
	"April",
	"Mei",
	"Juni",
	"Juli",
	"Agustus",
	"September",
	"Oktober",
	"November",
	"Desember",
];

export const HALL_OF_FAME_INTERVAL_MS = Math.max(
	60_000,
	Number(process.env.AETHERIA_HOF_INTERVAL_MS) || 60 * 60 * 1000
);
export const DEFAULT_HALL_OF_FAME_TARGET =
	process.env.AETHERIA_HOF_TARGET ||
	process.env.AETHERIA_NEWSLETTER_JID ||
	process.env.BOT_NEWSLETTER_JID ||
	DEFAULT_NEWSLETTER_JID;

let isRunning = false;

function toInt(value, fallback = 0) {
	const number = Number(value);

	return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function formatNumber(value) {
	return new Intl.NumberFormat("id-ID").format(toInt(value, 0));
}

function normalizePrefix(prefix) {
	return typeof prefix === "string" && prefix ? prefix : DEFAULT_PREFIX;
}

function getSendDay() {
	return Math.max(
		0,
		Math.min(6, toInt(process.env.AETHERIA_HOF_DAY, DEFAULT_SEND_DAY))
	);
}

function getSendHour() {
	return Math.max(
		0,
		Math.min(23, toInt(process.env.AETHERIA_HOF_HOUR, DEFAULT_SEND_HOUR))
	);
}

function getSendWindowHours() {
	return Math.max(
		1,
		Math.min(
			24,
			toInt(
				process.env.AETHERIA_HOF_WINDOW_HOURS,
				DEFAULT_SEND_WINDOW_HOURS
			)
		)
	);
}

function getJakartaDate(now = new Date()) {
	const date = now instanceof Date ? now : new Date(now);

	return new Date(date.getTime() + JAKARTA_OFFSET_MS);
}

export function getHallOfFameWeekKey(now = new Date()) {
	const local = getJakartaDate(now);
	const date = new Date(
		Date.UTC(
			local.getUTCFullYear(),
			local.getUTCMonth(),
			local.getUTCDate()
		)
	);
	const day = date.getUTCDay() || 7;

	date.setUTCDate(date.getUTCDate() + 4 - day);

	const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
	const week = Math.ceil(((date - yearStart) / DAY_MS + 1) / 7);

	return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function getHallOfFameScheduleText() {
	return `${DAY_NAMES[getSendDay()]} ${String(getSendHour()).padStart(2, "0")}:00 WIB`;
}

function formatJakartaDate(now = new Date()) {
	const local = getJakartaDate(now);
	const dayName = DAY_NAMES[local.getUTCDay()];
	const day = local.getUTCDate();
	const month = MONTH_NAMES[local.getUTCMonth()];
	const year = local.getUTCFullYear();
	const hour = String(local.getUTCHours()).padStart(2, "0");
	const minute = String(local.getUTCMinutes()).padStart(2, "0");

	return `${dayName}, ${day} ${month} ${year} ${hour}:${minute} WIB`;
}

function getJakartaParts(now = new Date()) {
	const local = getJakartaDate(now);

	return {
		day: local.getUTCDay(),
		hour: local.getUTCHours(),
	};
}

function cleanName(value) {
	return (
		String(value || "Adventurer")
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, 40) || "Adventurer"
	);
}

function normalizeActivity(player = {}) {
	return {
		wins: Math.max(0, toInt(player.activity?.wins, player.wins || 0)),
		jobs: Math.max(0, toInt(player.activity?.jobs, player.jobs || 0)),
		dailies: Math.max(0, toInt(player.activity?.dailies, 0)),
		boss: Math.max(0, toInt(player.activity?.boss, 0)),
		dungeons: Math.max(0, toInt(player.activity?.dungeons, 0)),
	};
}

function normalizeEntry(entry = {}) {
	const player = entry.player || entry;
	const activity = normalizeActivity(player);

	return {
		name: cleanName(entry.name || player.name),
		player,
		level: Math.max(1, toInt(player.level, 1)),
		xp: Math.max(0, toInt(player.xp, 0)),
		gold: Math.max(0, toInt(player.gold, 0)),
		streak: Math.max(0, toInt(player.dailyStreak?.count, 0)),
		bestStreak: Math.max(0, toInt(player.dailyStreak?.best, 0)),
		activity,
	};
}

function rankEntries(entries, selector, max = 5, minValue = 1) {
	return entries
		.map(normalizeEntry)
		.filter((entry) => selector(entry) >= minValue)
		.sort((a, b) => {
			const primary = selector(b) - selector(a);

			if (primary) {
				return primary;
			}

			return b.level - a.level || b.xp - a.xp || b.gold - a.gold;
		})
		.slice(0, max);
}

function getTopAdventurers(entries, max = 5) {
	return entries
		.map(normalizeEntry)
		.sort((a, b) => b.level - a.level || b.xp - a.xp || b.gold - a.gold)
		.slice(0, max);
}

function formatRankRows(entries, formatter) {
	if (!entries.length) {
		return ["▫️ Belum ada data cukup minggu ini."];
	}

	return entries.map((entry, index) => {
		const medal = ["🥇", "🥈", "🥉"][index] || `${index + 1}.`;

		return `${medal} *${entry.name}* — ${formatter(entry)}`;
	});
}

export function buildHallOfFameSections(entries = []) {
	const topAdventurers = getTopAdventurers(entries);
	const streaks = rankEntries(
		entries,
		(entry) => Math.max(entry.streak, entry.bestStreak),
		5
	);
	const hunters = rankEntries(entries, (entry) => entry.activity.wins, 5);
	const gold = rankEntries(entries, (entry) => entry.gold, 5);
	const workers = rankEntries(entries, (entry) => entry.activity.jobs, 5);

	return [
		{
			title: "Top Adventurer",
			rows: formatRankRows(
				topAdventurers,
				(entry) =>
					`Lv ${entry.level} · ${formatNumber(entry.xp)} XP · ${formatNumber(entry.gold)} gold`
			),
		},
		{
			title: "Daily Streak",
			rows: formatRankRows(
				streaks,
				(entry) =>
					`${formatNumber(entry.streak)} hari aktif · best ${formatNumber(entry.bestStreak)}`
			),
		},
		{
			title: "Hunter Aktif",
			rows: formatRankRows(
				hunters,
				(entry) => `${formatNumber(entry.activity.wins)} win jelajah`
			),
		},
		{
			title: "Gold Holder",
			rows: formatRankRows(
				gold,
				(entry) => `${formatNumber(entry.gold)} gold`
			),
		},
		{
			title: "Worker",
			rows: formatRankRows(
				workers,
				(entry) => `${formatNumber(entry.activity.jobs)} kerja selesai`
			),
		},
	];
}

export function formatWeeklyHallOfFame(
	entries = [],
	{ botNumber = "", now = new Date(), prefix = DEFAULT_PREFIX } = {}
) {
	const safePrefix = normalizePrefix(prefix);
	const sections = buildHallOfFameSections(entries);
	const botLink = buildWaMeLink(botNumber, `${safePrefix}hof`);
	const lines = [
		`🏆 *${BRAND_CONFIG.name} Weekly Hall of Fame*`,
		"━━━━━━━━━━━━━━━━━━━━",
		`Pekan: *${getHallOfFameWeekKey(now)}*`,
		`Snapshot: *${formatJakartaDate(now)}*`,
		`Pemain terscan: *${formatNumber(entries.length)}*`,
		"",
		"Hall of Fame ini memakai snapshot RPG aktif. Kejar posisi minggu depan lewat daily, jelajah, kerja, dan upgrade.",
	];

	for (const section of sections) {
		lines.push("", `*${section.title}*`, ...section.rows);
	}

	lines.push(
		"",
		"*Cara Naik Minggu Depan*",
		`- ${safePrefix}daily untuk jaga streak`,
		`- ${safePrefix}jelajah untuk XP dan win`,
		`- ${safePrefix}kerja mine untuk gold/material`,
		`- ${safePrefix}rpg untuk buka hub RPG`,
		"",
		"*Command*",
		`- ${safePrefix}hof`,
		`- ${safePrefix}leaderboard`,
		`- ${safePrefix}kembali`
	);

	if (botLink) {
		lines.push("", "*Link Bot*", botLink);
	}

	return lines.join("\n");
}

export function shouldSendWeeklyHallOfFame({
	now = new Date(),
	settings = {},
} = {}) {
	const parts = getJakartaParts(now);
	const sendDay = getSendDay();
	const sendHour = getSendHour();
	const sendWindowHours = getSendWindowHours();
	const inWindow =
		parts.day === sendDay &&
		parts.hour >= sendHour &&
		parts.hour < sendHour + sendWindowHours;
	const weekKey = getHallOfFameWeekKey(now);
	const lastSentWeek =
		settings.weeklyHallOfFameLastSentWeek ||
		settings.hallOfFameLastSentWeek ||
		"";

	return {
		shouldSend: inWindow && lastSentWeek !== weekKey,
		weekKey,
		inWindow,
		lastSentWeek,
	};
}

export function formatHallOfFameStatus(settings = {}) {
	const lastSentWeek =
		settings.weeklyHallOfFameLastSentWeek ||
		settings.hallOfFameLastSentWeek ||
		"belum pernah";
	const lastSentAt = settings.weeklyHallOfFameLastSentAt
		? formatJakartaDate(new Date(settings.weeklyHallOfFameLastSentAt))
		: "belum pernah";
	const target =
		settings.weeklyHallOfFameTarget || DEFAULT_HALL_OF_FAME_TARGET;

	return [
		"🏆 *Weekly Hall of Fame*",
		"━━━━━━━━━━━━━━━━━━━━",
		`Status periodic: *${settings.halloffame === false ? "OFF" : "ON"}*`,
		`Jadwal: *${getHallOfFameScheduleText()}*`,
		`Target: *${target}*`,
		`Terakhir kirim: *${lastSentWeek}*`,
		`Waktu kirim: *${lastSentAt}*`,
		"",
		"Command owner:",
		"- .hof send",
		"- .hof send <jid/nomor/idgrup>",
		"- .setting halloffame off",
	].join("\n");
}

export async function getHallOfFameEntries(limit = 50) {
	return getLeaderboard(Math.max(1, Math.min(Number(limit) || 50, 50)));
}

export async function sendWeeklyHallOfFame(
	sock,
	{
		botNumber = "",
		force = false,
		now = new Date(),
		prefix = DEFAULT_PREFIX,
		target = "",
	} = {}
) {
	if (!sock || typeof sock.sendMessage !== "function") {
		return {
			status: "no_sock",
		};
	}

	const settings = await SettingsModel.getSettings();
	const schedule = shouldSendWeeklyHallOfFame({ now, settings });

	if (!force && !schedule.shouldSend) {
		return {
			status: "skipped",
			...schedule,
		};
	}

	const destination =
		target ||
		settings.weeklyHallOfFameTarget ||
		DEFAULT_HALL_OF_FAME_TARGET;
	const entries = await getHallOfFameEntries(50);
	const text = formatWeeklyHallOfFame(entries, {
		botNumber,
		now,
		prefix,
	});
	const sent = await sock.sendMessage(destination, { text });

	await SettingsModel.updateSettings({
		weeklyHallOfFameLastSentAt: Date.now(),
		weeklyHallOfFameLastSentWeek: schedule.weekKey,
		weeklyHallOfFameLastTarget: destination,
	});

	return {
		status: "sent",
		entries,
		messageId: sent?.key?.id || "",
		target: destination,
		weekKey: schedule.weekKey,
	};
}

export async function runWeeklyHallOfFameTick(sock) {
	if (isRunning) {
		return {
			status: "busy",
		};
	}

	isRunning = true;

	try {
		const result = await sendWeeklyHallOfFame(sock);

		if (result.status === "sent") {
			print.info(
				`[HallOfFame] Sent weekly announcement to ${result.target} (${result.messageId || "-"})`
			);
		}

		return result;
	} catch (error) {
		print.error("[HallOfFame] Failed sending weekly announcement:", error);

		return {
			status: "error",
			error,
		};
	} finally {
		isRunning = false;
	}
}
