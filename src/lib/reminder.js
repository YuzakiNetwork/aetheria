import { BRAND_CONFIG } from "#config/brand";

const DEFAULT_TIMEZONE =
	process.env.AETHERIA_REMINDER_TIMEZONE || "Asia/Jakarta";
const DEFAULT_WINDOW_MINUTES = 5;

export const REMINDER_PAYLOAD_KEY = "aetheriaReminder";

export const DEFAULT_REMINDER_SLOTS = [
	{
		key: "pagi",
		label: "Daily Pagi",
		time: "07:00",
		type: "daily",
	},
	{
		key: "malam",
		label: "Party Malam",
		time: "19:30",
		type: "party",
	},
];

function isRecord(value) {
	return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeSlotKey(input) {
	const key = String(input || "")
		.trim()
		.toLowerCase();
	const aliases = {
		daily: "pagi",
		morning: "pagi",
		pagi: "pagi",
		party: "malam",
		evening: "malam",
		malam: "malam",
	};

	return aliases[key] || key;
}

export function getReminderSlot(input) {
	return (
		DEFAULT_REMINDER_SLOTS.find(
			(entry) => entry.key === normalizeSlotKey(input)
		) || null
	);
}

export function parseReminderTime(input) {
	const raw = String(input || "").trim();
	const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(raw);

	if (!match) {
		return null;
	}

	return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function normalizeReminderSlot(slot = {}) {
	const defaultSlot = getReminderSlot(slot.key);

	if (!defaultSlot) {
		return null;
	}

	return {
		...defaultSlot,
		time: parseReminderTime(slot.time) || defaultSlot.time,
	};
}

export function normalizeReminderConfig(config = {}) {
	const customSlots = Array.isArray(config?.slots)
		? config.slots.map(normalizeReminderSlot).filter(Boolean)
		: [];
	const slotMap = new Map(
		DEFAULT_REMINDER_SLOTS.map((slot) => [slot.key, { ...slot }])
	);

	for (const slot of customSlots) {
		slotMap.set(slot.key, slot);
	}

	return {
		enabled: Boolean(config?.enabled),
		timezone:
			typeof config?.timezone === "string" && config.timezone.trim()
				? config.timezone.trim()
				: DEFAULT_TIMEZONE,
		slots: [...slotMap.values()],
		lastSent: isRecord(config?.lastSent) ? { ...config.lastSent } : {},
		updatedAt: Number(config?.updatedAt || 0),
	};
}

export function setReminderSlotTime(config, slotInput, timeInput) {
	const normalized = normalizeReminderConfig(config);
	const slotKey = normalizeSlotKey(slotInput);
	const time = parseReminderTime(timeInput);
	const slot = normalized.slots.find((entry) => entry.key === slotKey);

	if (!slot) {
		return {
			status: "invalid_slot",
			config: normalized,
		};
	}

	if (!time) {
		return {
			status: "invalid_time",
			config: normalized,
		};
	}

	return {
		status: "ok",
		config: {
			...normalized,
			slots: normalized.slots.map((entry) =>
				entry.key === slotKey ? { ...entry, time } : entry
			),
			updatedAt: Date.now(),
		},
		slot: {
			...slot,
			time,
		},
	};
}

function getLocalParts(date, timezone) {
	const formatter = new Intl.DateTimeFormat("en-GB", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	});
	const parts = Object.fromEntries(
		formatter
			.formatToParts(date)
			.filter((part) => part.type !== "literal")
			.map((part) => [part.type, part.value])
	);
	const year = Number(parts.year);
	const month = Number(parts.month);
	const day = Number(parts.day);

	return {
		year,
		month,
		day,
		hour: Number(parts.hour),
		minute: Number(parts.minute),
		weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
		dayKey: `${parts.year}-${parts.month}-${parts.day}`,
	};
}

function timeToMinutes(time) {
	const [hour, minute] = time.split(":").map(Number);

	return hour * 60 + minute;
}

function isSlotDue(slot, parts, windowMinutes) {
	const nowMinute = parts.hour * 60 + parts.minute;
	const targetMinute = timeToMinutes(slot.time);

	return (
		nowMinute >= targetMinute && nowMinute <= targetMinute + windowMinutes
	);
}

export function getDueReminderSlots(config, date = new Date(), options = {}) {
	const normalized = normalizeReminderConfig(config);

	if (!normalized.enabled) {
		return [];
	}

	const windowMinutes = Math.max(
		0,
		Number(options.windowMinutes ?? DEFAULT_WINDOW_MINUTES)
	);
	const parts = getLocalParts(date, normalized.timezone);

	return normalized.slots
		.filter((slot) => isSlotDue(slot, parts, windowMinutes))
		.filter((slot) => normalized.lastSent[slot.key] !== parts.dayKey)
		.map((slot) => ({
			...slot,
			dayKey: parts.dayKey,
			timezone: normalized.timezone,
			weekday: parts.weekday,
		}));
}

export function markReminderSent(config, slotKey, dayKey) {
	const normalized = normalizeReminderConfig(config);
	const key = normalizeSlotKey(slotKey);

	return {
		...normalized,
		lastSent: {
			...normalized.lastSent,
			[key]: dayKey,
		},
		updatedAt: Date.now(),
	};
}

export function resetReminderConfig(config = {}) {
	const normalized = normalizeReminderConfig(config);

	return {
		...normalized,
		slots: DEFAULT_REMINDER_SLOTS.map((slot) => ({ ...slot })),
		lastSent: {},
		updatedAt: Date.now(),
	};
}

export function formatReminderMessage(slotInput, prefix = ".") {
	const slot =
		typeof slotInput === "string" ? getReminderSlot(slotInput) : slotInput;

	if (slot?.type === "party" || slot?.key === "malam") {
		return [
			`🌙 *Party Night ${BRAND_CONFIG.name}*`,
			"━━━━━━━━━━━━━━━━━━━━",
			"Waktu yang bagus untuk aktivitas grup.",
			"",
			`• Cari squad: \`${prefix}squad\``,
			`• Jalankan dungeon: \`${prefix}dungeon\``,
			`• Cek World Boss: \`${prefix}boss\` / \`${prefix}serangboss\``,
			`• Flex progress: \`${prefix}progress\``,
			"",
			"_Reminder otomatis tanpa tag massal._",
		].join("\n");
	}

	return [
		`🌅 *Daily ${BRAND_CONFIG.name}*`,
		"━━━━━━━━━━━━━━━━━━━━",
		"Aethers, jangan lupa ambil bekal dan cek arah main hari ini.",
		"",
		`• Daily: \`${prefix}daily\``,
		`• Arah main: \`${prefix}guide\``,
		`• Klaim misi: \`${prefix}misi claim\``,
		`• Checklist: \`${prefix}progress\``,
		"",
		"_Reminder otomatis tanpa tag massal._",
	].join("\n");
}

export function formatReminderStatus(config, prefix = ".") {
	const normalized = normalizeReminderConfig(config);
	const status = normalized.enabled ? "ON" : "OFF";
	const slots = normalized.slots
		.map((slot) => `• *${slot.key}* - ${slot.label}: *${slot.time}*`)
		.join("\n");

	return [
		"⏰ *Reminder Grup Aetheria*",
		"━━━━━━━━━━━━━━━━━━━━",
		`Status: *${status}*`,
		`Timezone: *${normalized.timezone}*`,
		"",
		slots,
		"",
		`Aktifkan: \`${prefix}reminder on\``,
		`Matikan: \`${prefix}reminder off\``,
		`Ubah jam: \`${prefix}reminder jam pagi 07:30\``,
		`Tes pesan: \`${prefix}reminder test malam\``,
	].join("\n");
}
