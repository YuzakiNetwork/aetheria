export const GROUP_MEMORY_PAYLOAD_KEY = "groupMemory";
export const GROUP_MEMORY_MAX_ITEMS = 100;
export const GROUP_MEMORY_TEXT_LIMIT = 700;

function toInt(value, fallback = 0) {
	const number = Number(value);

	return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function cleanText(value = "", limit = GROUP_MEMORY_TEXT_LIMIT) {
	return String(value || "")
		.replace(/\r/g, "")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim()
		.slice(0, limit);
}

function cleanName(value = "") {
	return (
		String(value || "")
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, 40) || "-"
	);
}

function normalizeTag(tag = "") {
	return String(tag || "")
		.toLowerCase()
		.replace(/^#/, "")
		.replace(/[^a-z0-9_-]/g, "")
		.slice(0, 24);
}

export function parseMemoryTags(input = "") {
	const tags = [];
	const matches = String(input || "").matchAll(/#([a-z0-9_-]{2,24})/gi);

	for (const match of matches) {
		const tag = normalizeTag(match[1]);

		if (tag && !tags.includes(tag)) {
			tags.push(tag);
		}
	}

	return tags.slice(0, 5);
}

export function stripMemoryTags(input = "") {
	return cleanText(String(input || "").replace(/#[a-z0-9_-]{2,24}/gi, ""));
}

export function normalizeGroupMemoryPayload(payload = {}) {
	const entries = Array.isArray(payload?.entries)
		? payload.entries
				.map((entry) => ({
					id: Math.max(1, toInt(entry?.id, 0)),
					type: entry?.type === "memory" ? "memory" : "quote",
					text: cleanText(entry?.text),
					authorJid: cleanText(entry?.authorJid, 80),
					authorName: cleanName(entry?.authorName),
					savedByJid: cleanText(entry?.savedByJid, 80),
					savedByName: cleanName(entry?.savedByName),
					sourceMessageId: cleanText(entry?.sourceMessageId, 80),
					createdAt: Math.max(0, toInt(entry?.createdAt, 0)),
					tags: Array.isArray(entry?.tags)
						? entry.tags
								.map(normalizeTag)
								.filter(Boolean)
								.slice(0, 5)
						: [],
				}))
				.filter((entry) => entry.id && entry.text)
				.sort((a, b) => a.id - b.id)
		: [];
	const capped = entries.slice(-GROUP_MEMORY_MAX_ITEMS);
	const highestId = capped.reduce((max, entry) => Math.max(max, entry.id), 0);

	return {
		nextId: Math.max(highestId + 1, toInt(payload?.nextId, 1)),
		entries: capped,
	};
}

export function addGroupMemoryEntry(payload = {}, input = {}) {
	const current = normalizeGroupMemoryPayload(payload);
	const entry = {
		id: current.nextId,
		type: input.type === "memory" ? "memory" : "quote",
		text: cleanText(input.text),
		authorJid: cleanText(input.authorJid, 80),
		authorName: cleanName(input.authorName),
		savedByJid: cleanText(input.savedByJid, 80),
		savedByName: cleanName(input.savedByName),
		sourceMessageId: cleanText(input.sourceMessageId, 80),
		createdAt: Math.max(1, toInt(input.createdAt, Date.now())),
		tags: Array.isArray(input.tags)
			? input.tags.map(normalizeTag).filter(Boolean).slice(0, 5)
			: [],
	};

	if (!entry.text) {
		return {
			status: "empty",
			payload: current,
		};
	}

	return {
		status: "ok",
		entry,
		payload: normalizeGroupMemoryPayload({
			nextId: current.nextId + 1,
			entries: [...current.entries, entry],
		}),
	};
}

export function deleteGroupMemoryEntry(payload = {}, id) {
	const current = normalizeGroupMemoryPayload(payload);
	const targetId = toInt(id, 0);
	const entry = current.entries.find((item) => item.id === targetId);

	if (!entry) {
		return {
			status: "missing",
			payload: current,
		};
	}

	return {
		status: "ok",
		entry,
		payload: {
			...current,
			entries: current.entries.filter((item) => item.id !== targetId),
		},
	};
}

export function findGroupMemoryEntry(payload = {}, id) {
	const current = normalizeGroupMemoryPayload(payload);
	const targetId = toInt(id, 0);

	return current.entries.find((entry) => entry.id === targetId) || null;
}

function matchesQuery(entry, query = "") {
	const needle = String(query || "")
		.toLowerCase()
		.trim();

	if (!needle) {
		return true;
	}

	return [
		entry.text,
		entry.authorName,
		entry.savedByName,
		entry.authorJid,
		entry.savedByJid,
		...(entry.tags || []),
	]
		.join(" ")
		.toLowerCase()
		.includes(needle);
}

function matchesTags(entry, tags = []) {
	const normalized = tags.map(normalizeTag).filter(Boolean);

	if (!normalized.length) {
		return true;
	}

	return normalized.every((tag) => entry.tags?.includes(tag));
}

function matchesAuthor(entry, authorJid = "") {
	const author = cleanText(authorJid, 80);

	if (!author) {
		return true;
	}

	return entry.authorJid === author;
}

export function searchGroupMemoryEntries(payload = {}, options = {}) {
	const current = normalizeGroupMemoryPayload(payload);
	const limit = Math.max(1, Math.min(toInt(options.limit, 10), 25));

	return current.entries
		.filter((entry) => !options.type || entry.type === options.type)
		.filter((entry) => matchesQuery(entry, options.query))
		.filter((entry) => matchesTags(entry, options.tags))
		.filter((entry) => matchesAuthor(entry, options.authorJid))
		.sort((a, b) => b.id - a.id)
		.slice(0, limit);
}

export function pickRandomGroupMemoryEntry(payload = {}, options = {}) {
	const entries = searchGroupMemoryEntries(payload, {
		...options,
		limit: GROUP_MEMORY_MAX_ITEMS,
	});

	if (!entries.length) {
		return null;
	}

	return entries[Math.floor(Math.random() * entries.length)];
}

function formatDate(timestamp) {
	return new Date(Math.max(1, toInt(timestamp, Date.now()))).toLocaleString(
		"id-ID",
		{
			dateStyle: "medium",
			timeStyle: "short",
			timeZone: "Asia/Jakarta",
		}
	);
}

function formatJidLabel(jid = "") {
	const digits = String(jid || "").replace(/\D/g, "");

	return digits ? `+${digits}` : "-";
}

function formatEntryKind(type = "quote") {
	return type === "memory" ? "Memory" : "Quote";
}

function formatTags(tags = []) {
	return tags.length ? tags.map((tag) => `#${tag}`).join(" ") : "-";
}

export function formatGroupMemoryEntry(entry, prefix = ".") {
	if (!entry) {
		return [
			"💬 *Group Memory*",
			"━━━━━━━━━━━━━━━━━━━━",
			"Memori tidak ditemukan.",
			`Cek daftar: ${prefix}quote list`,
		].join("\n");
	}

	return [
		`💬 *${formatEntryKind(entry.type)} #${entry.id}*`,
		"━━━━━━━━━━━━━━━━━━━━",
		`> ${entry.text.replace(/\n/g, "\n> ")}`,
		"",
		`Dari: *${entry.authorName !== "-" ? entry.authorName : formatJidLabel(entry.authorJid)}*`,
		`Disimpan oleh: *${entry.savedByName !== "-" ? entry.savedByName : formatJidLabel(entry.savedByJid)}*`,
		`Tanggal: *${formatDate(entry.createdAt)}*`,
		`Tag: ${formatTags(entry.tags)}`,
		"",
		`Random: ${prefix}${entry.type} random`,
		`List: ${prefix}${entry.type} list`,
	].join("\n");
}

export function formatGroupMemoryList(
	entries = [],
	type = "quote",
	prefix = "."
) {
	const label = formatEntryKind(type);

	if (!entries.length) {
		return [
			`💬 *${label} Grup*`,
			"━━━━━━━━━━━━━━━━━━━━",
			`Belum ada ${label.toLowerCase()} yang cocok.`,
			type === "quote"
				? `Reply pesan lalu ketik: ${prefix}quote add #tag`
				: `Tambah memori: ${prefix}memory add <teks> #tag`,
		].join("\n");
	}

	return [
		`💬 *${label} Grup*`,
		"━━━━━━━━━━━━━━━━━━━━",
		...entries.map((entry) => {
			const preview =
				entry.text.length > 90
					? `${entry.text.slice(0, 87)}...`
					: entry.text;

			return `#${entry.id} · ${preview.replace(/\n/g, " ")} · ${formatTags(entry.tags)}`;
		}),
		"",
		`Detail: ${prefix}${type} <id>`,
		`Random: ${prefix}${type} random`,
	].join("\n");
}

export function formatGroupMemoryAdded(entry, prefix = ".") {
	return [
		`✅ *${formatEntryKind(entry.type)} disimpan*`,
		"━━━━━━━━━━━━━━━━━━━━",
		`ID: *#${entry.id}*`,
		`Tag: ${formatTags(entry.tags)}`,
		"",
		`Lihat: ${prefix}${entry.type} ${entry.id}`,
		`Random: ${prefix}${entry.type} random`,
	].join("\n");
}

export function formatGroupMemoryHelp(prefix = ".", command = "quote") {
	return [
		"💬 *Quote & Memory Grup*",
		"━━━━━━━━━━━━━━━━━━━━",
		"*Quote*",
		`- Reply pesan: ${prefix}quote add #lucu`,
		`- Random: ${prefix}quote random`,
		`- List: ${prefix}quote list`,
		`- Search: ${prefix}quote search <kata>`,
		`- Detail: ${prefix}quote <id>`,
		`- Hapus: ${prefix}quote delete <id>`,
		"",
		"*Memory*",
		`- Tambah: ${prefix}memory add <teks> #tag`,
		`- Random: ${prefix}memory random`,
		`- List: ${prefix}memory list`,
		`- Search: ${prefix}memory search <kata>`,
		`- Detail: ${prefix}memory <id>`,
		"",
		`Command aktif: ${prefix}${command}`,
	].join("\n");
}
