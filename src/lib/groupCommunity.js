import { BRAND_CONFIG } from "#config/brand";

export const GROUP_WELCOME_PAYLOAD_KEY = "groupWelcome";
export const GROUP_TOPIC_PAYLOAD_KEY = "groupTopic";
export const GROUP_EVENT_PAYLOAD_KEY = "groupEvents";

export const DEFAULT_GROUP_TIMEZONE =
	process.env.AETHERIA_GROUP_TIMEZONE || "Asia/Jakarta";
export const DEFAULT_TOPIC_TIME = "20:00";
export const GROUP_EVENT_MAX_ITEMS = 30;
export const GROUP_EVENT_REMINDER_MINUTES = [60, 15];

export const DEFAULT_WELCOME_TEMPLATE = [
	"👋 Selamat datang {mention} di *{group}*",
	"━━━━━━━━━━━━━━━━━━━━",
	"{description}",
	"",
	"Mulai dari sini:",
	"• Kenalan singkat biar member lain tahu kamu.",
	"• Baca rules atau pinned message grup.",
	"• Coba bot: {prefix}menu",
].join("\n");

const TOPIC_BANK = {
	anime: [
		"Anime/manga apa yang paling cocok direkomendasikan ke member baru minggu ini?",
		"Karakter anime mana yang menurut kalian paling cocok jadi party leader?",
		"Kalau grup ini jadi guild anime, role kalian apa?",
		"Ending anime apa yang masih susah dilupakan?",
		"Power system anime mana yang paling seru kalau dijadikan game?",
	],
	community: [
		"Hal kecil apa yang bikin grup ini tetap enak buat diajak ngobrol?",
		"Kalau ada member baru masuk, topik apa yang paling gampang buat mulai obrolan?",
		"Moment grup apa yang paling lucu atau paling random belakangan ini?",
		"Rekomendasi kegiatan ringan apa yang bisa bikin grup lebih hidup malam ini?",
		"Satu aturan tidak tertulis di grup ini yang harus dipahami member baru apa?",
	],
	game: [
		"Game apa yang paling cocok dimainkan bareng member grup minggu ini?",
		"Build, karakter, atau role favorit kalian di game yang lagi dimainkan apa?",
		"Kalau ada event komunitas game, format yang paling seru menurut kalian apa?",
		"Game lama apa yang masih layak dimainkan lagi sekarang?",
		"Mode kompetitif atau santai, mana yang lebih cocok untuk grup ini?",
	],
	random: [
		"Kalau hari ini harus pilih satu makanan untuk semua member grup, pilih apa?",
		"Opini kecil yang kalian yakin benar tapi sering diperdebatkan orang apa?",
		"Hal paling absurd yang pernah terjadi di chat grup apa?",
		"Kalau grup ini punya slogan, kalimatnya apa?",
		"Pertanyaan random: lebih pilih punya luck tinggi atau stamina tidak habis?",
	],
	rpg: [
		"Kalau masuk dunia Aetheria, kalian pilih jadi warrior, mage, ranger, atau rogue?",
		"Party ideal untuk raid malam ini menurut kalian komposisinya gimana?",
		"Monster atau boss seperti apa yang paling seru kalau muncul di Aetheria?",
		"Item RPG apa yang kalian pengin ada di Aetheria berikutnya?",
		"Kalau guild grup ini punya nama resmi, namanya apa?",
	],
	school: [
		"Target kecil apa yang mau diselesaikan bareng minggu ini?",
		"Materi atau tugas apa yang paling butuh dibahas santai di grup?",
		"Tips belajar singkat yang paling ngebantu kalian apa?",
		"Kalau bikin sesi diskusi 15 menit, topik pertamanya apa?",
		"Satu hal yang bikin belajar bareng di grup lebih nyaman apa?",
	],
	tech: [
		"Tools atau app apa yang belakangan ini paling membantu kerjaan kalian?",
		"Kalau bikin project kecil bareng, ide paling realistisnya apa?",
		"Bug paling aneh yang pernah kalian temui apa?",
		"AI paling berguna kalau dipakai untuk workflow apa?",
		"Stack teknologi apa yang pengin kalian pelajari berikutnya?",
	],
};

function cleanText(input = "", limit = 700) {
	return String(input || "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, limit);
}

function cleanMultiline(input = "", limit = 700) {
	return String(input || "")
		.replace(/\r\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim()
		.slice(0, limit);
}

function normalizePrefix(prefix = ".") {
	const raw = String(prefix || ".").trim();

	return raw || ".";
}

function extractNumber(jid = "") {
	return String(jid || "").match(/\d{5,}/)?.[0] || "";
}

function mentionToken(jid = "") {
	const number = extractNumber(jid);

	return number ? `@${number}` : "@member";
}

function parseTime(input, fallback = DEFAULT_TOPIC_TIME) {
	const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(
		String(input || "").trim()
	);

	if (!match) {
		return fallback;
	}

	return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function timeToMinutes(time) {
	const [hour, minute] = parseTime(time).split(":").map(Number);

	return hour * 60 + minute;
}

function getLocalParts(date = new Date(), timezone = DEFAULT_GROUP_TIMEZONE) {
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

	return {
		year: Number(parts.year),
		month: Number(parts.month),
		day: Number(parts.day),
		hour: Number(parts.hour),
		minute: Number(parts.minute),
		dayKey: `${parts.year}-${parts.month}-${parts.day}`,
	};
}

function makeJakartaDate(year, month, day, hour, minute) {
	return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, 0, 0));
}

function hashString(input = "") {
	let hash = 0;

	for (const char of String(input)) {
		hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	}

	return hash;
}

function formatDateTime(timestamp, timezone = DEFAULT_GROUP_TIMEZONE) {
	return new Intl.DateTimeFormat("id-ID", {
		timeZone: timezone,
		weekday: "short",
		year: "numeric",
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).format(new Date(timestamp));
}

export function getGroupPayloads(group) {
	return group?.payloads && typeof group.payloads === "object"
		? group.payloads
		: {};
}

export function getGroupSubject(metadata = {}, fallback = "Grup Aetheria") {
	return cleanText(metadata?.subject || metadata?.name || fallback, 80);
}

export function getGroupDescription(metadata = {}, fallback = "") {
	return cleanText(
		metadata?.desc ||
			metadata?.description ||
			metadata?.subjectOwnerDescription ||
			fallback,
		280
	);
}

export function normalizeWelcomeConfig(config = {}) {
	const template = cleanMultiline(config?.template, 900);

	return {
		enabled: Boolean(config?.enabled),
		template: template || DEFAULT_WELCOME_TEMPLATE,
		updatedAt: Number(config?.updatedAt || 0),
	};
}

export function renderCommunityTemplate(template = "", context = {}) {
	const groupName = cleanText(context.groupName || "Grup Aetheria", 80);
	const rawDescription = cleanText(context.description || "", 280);
	const description =
		rawDescription ||
		"Silakan ikut obrolan dengan santai dan hormati rules grup.";
	const replacements = {
		bot: BRAND_CONFIG.name,
		description: rawDescription
			? `Tentang grup: ${description}`
			: description,
		group: groupName,
		mention: context.mention || mentionToken(context.participantJid),
		prefix: normalizePrefix(context.prefix),
		rawDescription,
	};

	return cleanMultiline(
		String(template || DEFAULT_WELCOME_TEMPLATE).replace(
			/\{(bot|description|group|mention|prefix|rawDescription)\}/g,
			(_, key) => replacements[key] || ""
		),
		1000
	);
}

export function formatWelcomeMessage(config = {}, context = {}) {
	const normalized = normalizeWelcomeConfig(config);
	const participantJid = context.participantJid || "";

	return {
		text: renderCommunityTemplate(normalized.template, {
			...context,
			mention: context.mention || mentionToken(participantJid),
		}),
		mentions: participantJid ? [participantJid] : [],
	};
}

export function formatWelcomeStatus(config = {}, prefix = ".") {
	const normalized = normalizeWelcomeConfig(config);
	const safePrefix = normalizePrefix(prefix);

	return [
		"👋 *Welcome Kit Grup*",
		"━━━━━━━━━━━━━━━━━━━━",
		`Status: *${normalized.enabled ? "ON" : "OFF"}*`,
		"",
		"Placeholder:",
		"`{mention}`, `{group}`, `{description}`, `{prefix}`, `{bot}`",
		"",
		`Aktifkan: \`${safePrefix}welcome on\``,
		`Matikan: \`${safePrefix}welcome off\``,
		`Ubah teks: \`${safePrefix}welcome set <teks>\``,
		`Preview: \`${safePrefix}welcome preview\``,
	].join("\n");
}

export function normalizeTopicConfig(config = {}) {
	const category = String(config?.category || "auto").toLowerCase();

	return {
		enabled: Boolean(config?.enabled),
		timezone:
			typeof config?.timezone === "string" && config.timezone.trim()
				? config.timezone.trim()
				: DEFAULT_GROUP_TIMEZONE,
		time: parseTime(config?.time, DEFAULT_TOPIC_TIME),
		category: Object.hasOwn(TOPIC_BANK, category) ? category : "auto",
		lastSentDay: String(config?.lastSentDay || ""),
		updatedAt: Number(config?.updatedAt || 0),
	};
}

export function inferTopicCategory(context = {}) {
	const haystack = `${context.groupName || ""} ${context.description || ""}`
		.toLowerCase()
		.trim();

	if (/aetheria|rpg|raid|boss|guild|dungeon|quest/.test(haystack)) {
		return "rpg";
	}
	if (/anime|manga|wibu|otaku|manhwa|donghua/.test(haystack)) {
		return "anime";
	}
	if (
		/game|gaming|mobile legends|mlbb|genshin|valorant|minecraft/.test(
			haystack
		)
	) {
		return "game";
	}
	if (/kelas|sekolah|belajar|study|kampus|tugas/.test(haystack)) {
		return "school";
	}
	if (/code|coding|program|developer|dev|linux|tech|ai/.test(haystack)) {
		return "tech";
	}

	return "community";
}

export function getDueTopic(config = {}, date = new Date(), options = {}) {
	const normalized = normalizeTopicConfig(config);

	if (!normalized.enabled) {
		return null;
	}

	const windowMinutes = Math.max(0, Number(options.windowMinutes ?? 5));
	const parts = getLocalParts(date, normalized.timezone);
	const nowMinute = parts.hour * 60 + parts.minute;
	const targetMinute = timeToMinutes(normalized.time);

	if (
		nowMinute < targetMinute ||
		nowMinute > targetMinute + windowMinutes ||
		normalized.lastSentDay === parts.dayKey
	) {
		return null;
	}

	return {
		dayKey: parts.dayKey,
		timezone: normalized.timezone,
	};
}

export function markTopicSent(config = {}, dayKey = "") {
	return {
		...normalizeTopicConfig(config),
		lastSentDay: String(dayKey || ""),
		updatedAt: Date.now(),
	};
}

export function buildTopicSuggestion(
	config = {},
	context = {},
	date = new Date()
) {
	const normalized = normalizeTopicConfig(config);
	const parts = getLocalParts(date, normalized.timezone);
	const inferred =
		normalized.category === "auto"
			? inferTopicCategory(context)
			: normalized.category;
	const category =
		inferred === "random"
			? Object.keys(TOPIC_BANK)[
					hashString(
						`${context.groupId || ""}:${parts.dayKey}:random`
					) % Object.keys(TOPIC_BANK).length
				]
			: inferred;
	const bank = TOPIC_BANK[category] || TOPIC_BANK.community;
	const question =
		bank[
			hashString(`${context.groupId || ""}:${parts.dayKey}:${category}`) %
				bank.length
		];
	const safePrefix = normalizePrefix(context.prefix);

	return [
		"💬 *Topik Grup Hari Ini*",
		"━━━━━━━━━━━━━━━━━━━━",
		question,
		"",
		"Balas santai saja. Kalau topiknya kurang cocok, admin bisa pakai:",
		`\`${safePrefix}topik kategori auto|rpg|game|anime|tech|school|random\``,
	].join("\n");
}

export function formatTopicStatus(config = {}, prefix = ".") {
	const normalized = normalizeTopicConfig(config);
	const safePrefix = normalizePrefix(prefix);

	return [
		"💬 *Auto Topic Grup*",
		"━━━━━━━━━━━━━━━━━━━━",
		`Status: *${normalized.enabled ? "ON" : "OFF"}*`,
		`Jam: *${normalized.time}*`,
		`Kategori: *${normalized.category}*`,
		`Timezone: *${normalized.timezone}*`,
		"",
		`Generate sekarang: \`${safePrefix}topik\``,
		`Aktifkan harian: \`${safePrefix}topik on\``,
		`Ubah jam: \`${safePrefix}topik jam 20:30\``,
		`Ubah kategori: \`${safePrefix}topik kategori rpg\``,
	].join("\n");
}

export function parseGroupEventDate(input = "", now = new Date()) {
	const raw = String(input || "")
		.toLowerCase()
		.trim()
		.replace(/\s+/g, " ");
	let match = /^(hari ini|today)\s+([01]?\d|2[0-3]):([0-5]\d)$/.exec(raw);

	if (match) {
		const parts = getLocalParts(now);
		return makeJakartaDate(
			parts.year,
			parts.month,
			parts.day,
			Number(match[2]),
			Number(match[3])
		);
	}

	match = /^(besok|tomorrow)\s+([01]?\d|2[0-3]):([0-5]\d)$/.exec(raw);
	if (match) {
		const parts = getLocalParts(now);
		return makeJakartaDate(
			parts.year,
			parts.month,
			parts.day + 1,
			Number(match[2]),
			Number(match[3])
		);
	}

	match =
		/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+([01]?\d|2[0-3]):([0-5]\d)$/.exec(
			raw
		);
	if (match) {
		return makeJakartaDate(
			Number(match[1]),
			Number(match[2]),
			Number(match[3]),
			Number(match[4]),
			Number(match[5])
		);
	}

	match =
		/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})\s+([01]?\d|2[0-3]):([0-5]\d)$/.exec(
			raw
		);
	if (match) {
		return makeJakartaDate(
			Number(match[3]),
			Number(match[2]),
			Number(match[1]),
			Number(match[4]),
			Number(match[5])
		);
	}

	return null;
}

export function parseGroupEventInput(input = "", now = new Date()) {
	const parts = String(input || "")
		.split("|")
		.map((part) => part.trim());
	const [title, dateText, description = "", location = "", duration = "60"] =
		parts;

	if (!title || !dateText) {
		return { status: "invalid_format" };
	}

	const startDate = parseGroupEventDate(dateText, now);
	if (!startDate || Number.isNaN(startDate.getTime())) {
		return { status: "invalid_date" };
	}

	if (startDate.getTime() <= now.getTime()) {
		return { status: "past_date" };
	}

	const durationMinutes = Math.max(
		15,
		Math.min(24 * 60, Number.parseInt(duration, 10) || 60)
	);
	const event = {
		title: cleanText(title, 90),
		description: cleanMultiline(description, 500),
		location: cleanText(location, 120),
		startAt: startDate.getTime(),
		endAt: startDate.getTime() + durationMinutes * 60 * 1000,
	};

	return event.title ? { status: "ok", event } : { status: "invalid_title" };
}

export function normalizeGroupEventPayload(payload = {}) {
	const events = Array.isArray(payload?.events)
		? payload.events
				.map((event) => ({
					id: Number(event?.id || 0),
					title: cleanText(event?.title, 90),
					description: cleanMultiline(event?.description, 500),
					location: cleanText(event?.location, 120),
					startAt: Number(event?.startAt || 0),
					endAt: Number(event?.endAt || 0),
					createdAt: Number(event?.createdAt || 0),
					createdByJid: String(event?.createdByJid || ""),
					createdByName: cleanText(event?.createdByName, 60),
					notified: Array.isArray(event?.notified)
						? event.notified.map(String)
						: [],
				}))
				.filter(
					(event) => event.id > 0 && event.title && event.startAt > 0
				)
		: [];
	const sorted = events
		.sort((a, b) => a.startAt - b.startAt)
		.slice(-GROUP_EVENT_MAX_ITEMS);
	const nextId = Math.max(
		Number(payload?.nextId || 1),
		...sorted.map((event) => event.id + 1),
		1
	);

	return {
		nextId,
		events: sorted,
	};
}

export function addGroupEvent(payload = {}, eventInput = {}) {
	const normalized = normalizeGroupEventPayload(payload);
	const event = {
		id: normalized.nextId,
		title: cleanText(eventInput.title, 90),
		description: cleanMultiline(eventInput.description, 500),
		location: cleanText(eventInput.location, 120),
		startAt: Number(eventInput.startAt || 0),
		endAt: Number(eventInput.endAt || 0),
		createdAt: Number(eventInput.createdAt || Date.now()),
		createdByJid: String(eventInput.createdByJid || ""),
		createdByName: cleanText(eventInput.createdByName, 60),
		notified: [],
	};

	if (!event.title || event.startAt <= 0) {
		return { status: "invalid_event", payload: normalized };
	}

	const events = [...normalized.events, event]
		.sort((a, b) => a.startAt - b.startAt)
		.slice(-GROUP_EVENT_MAX_ITEMS);

	return {
		status: "ok",
		event,
		payload: {
			nextId: normalized.nextId + 1,
			events,
		},
	};
}

export function deleteGroupEvent(payload = {}, id) {
	const normalized = normalizeGroupEventPayload(payload);
	const numericId = Number(id);
	const events = normalized.events.filter((event) => event.id !== numericId);

	return {
		status: events.length === normalized.events.length ? "not_found" : "ok",
		payload: {
			...normalized,
			events,
		},
	};
}

export function findGroupEvent(payload = {}, id) {
	const normalized = normalizeGroupEventPayload(payload);
	const numericId = Number(id);

	return normalized.events.find((event) => event.id === numericId) || null;
}

export function getUpcomingGroupEvents(payload = {}, date = new Date()) {
	const now = date.getTime();

	return normalizeGroupEventPayload(payload).events.filter(
		(event) => event.startAt + 15 * 60 * 1000 >= now
	);
}

export function getDueGroupEventReminders(
	payload = {},
	date = new Date(),
	options = {}
) {
	const now = date.getTime();
	const windowMinutes = Math.max(1, Number(options.windowMinutes ?? 5));
	const reminderMinutes = Array.isArray(options.reminderMinutes)
		? options.reminderMinutes
		: GROUP_EVENT_REMINDER_MINUTES;
	const due = [];

	for (const event of normalizeGroupEventPayload(payload).events) {
		for (const minute of reminderMinutes) {
			const key = String(minute);
			const target = event.startAt - Number(minute) * 60 * 1000;

			if (
				now >= target &&
				now <= target + windowMinutes * 60 * 1000 &&
				!event.notified.includes(key)
			) {
				due.push({ event, minute: Number(minute) });
			}
		}
	}

	return due;
}

export function markGroupEventNotified(payload = {}, eventId, minute) {
	const normalized = normalizeGroupEventPayload(payload);
	const key = String(minute);

	return {
		...normalized,
		events: normalized.events.map((event) =>
			event.id === Number(eventId)
				? {
						...event,
						notified: [...new Set([...event.notified, key])],
					}
				: event
		),
	};
}

export function formatGroupEventHelp(prefix = ".", command = "event") {
	const safePrefix = normalizePrefix(prefix);

	return [
		"🗓️ *Agenda Grup*",
		"━━━━━━━━━━━━━━━━━━━━",
		`Tambah: \`${safePrefix}${command} add Judul | besok 20:00 | deskripsi | lokasi | 60\``,
		"Format tanggal: `besok 20:00`, `hari ini 21:00`, atau `2026-06-13 20:00`",
		"",
		`List: \`${safePrefix}${command} list\``,
		`Detail: \`${safePrefix}${command} <id>\``,
		`Kirim event card: \`${safePrefix}${command} native <id>\``,
		`Hapus: \`${safePrefix}${command} delete <id>\``,
	].join("\n");
}

export function formatGroupEventList(events = [], prefix = ".") {
	if (!events.length) {
		return [
			"🗓️ *Agenda Grup*",
			"━━━━━━━━━━━━━━━━━━━━",
			"Belum ada agenda aktif.",
			"",
			`Tambah dengan: \`${normalizePrefix(prefix)}event add Judul | besok 20:00 | deskripsi\``,
		].join("\n");
	}

	return [
		"🗓️ *Agenda Grup*",
		"━━━━━━━━━━━━━━━━━━━━",
		...events
			.slice(0, 10)
			.map(
				(event) =>
					`#${event.id} *${event.title}*\n${formatDateTime(event.startAt)}`
			),
		"",
		`Detail: \`${normalizePrefix(prefix)}event <id>\``,
	].join("\n");
}

export function formatGroupEventDetail(event, prefix = ".") {
	if (!event) {
		return "Agenda tidak ditemukan.";
	}

	const lines = [
		`🗓️ *Agenda #${event.id}: ${event.title}*`,
		"━━━━━━━━━━━━━━━━━━━━",
		`Mulai: *${formatDateTime(event.startAt)}*`,
		event.endAt ? `Selesai: *${formatDateTime(event.endAt)}*` : "",
		event.location ? `Lokasi: *${event.location}*` : "",
		event.description ? "" : "",
		event.description || "",
		"",
		`Native card: \`${normalizePrefix(prefix)}event native ${event.id}\``,
		`Hapus: \`${normalizePrefix(prefix)}event delete ${event.id}\``,
	];

	return lines.filter((line) => line !== "").join("\n");
}

export function formatGroupEventReminder(event, minute = 0, prefix = ".") {
	const distance =
		Number(minute) > 0
			? `mulai sekitar *${minute} menit lagi*`
			: "dimulai sekarang";

	return [
		"⏰ *Reminder Agenda Grup*",
		"━━━━━━━━━━━━━━━━━━━━",
		`*${event.title}* ${distance}.`,
		`Waktu: *${formatDateTime(event.startAt)}*`,
		event.location ? `Lokasi: *${event.location}*` : "",
		event.description ? "" : "",
		event.description || "",
		"",
		`Detail: \`${normalizePrefix(prefix)}event ${event.id}\``,
	]
		.filter((line) => line !== "")
		.join("\n");
}

export function toWhatsAppEventPayload(event) {
	const description = [
		event.description || "",
		event.location ? `Lokasi: ${event.location}` : "",
	]
		.filter(Boolean)
		.join("\n");

	return {
		event: {
			name: event.title,
			description,
			startDate: new Date(event.startAt),
			endDate: event.endAt ? new Date(event.endAt) : undefined,
			extraGuestsAllowed: true,
		},
	};
}
