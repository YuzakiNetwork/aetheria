import {
	addGroupMemoryEntry,
	deleteGroupMemoryEntry,
	formatGroupMemoryEntry,
	formatGroupMemoryList,
	normalizeGroupMemoryPayload,
	parseMemoryTags,
	pickRandomGroupMemoryEntry,
	searchGroupMemoryEntries,
	stripMemoryTags,
} from "#lib/groupMemory";
import assert from "node:assert/strict";
import test from "node:test";

test("parseMemoryTags and stripMemoryTags extract clean tags", () => {
	assert.deepEqual(parseMemoryTags("halo #Lucu #legend #lucu"), [
		"lucu",
		"legend",
	]);
	assert.equal(stripMemoryTags("Moment bagus #legend"), "Moment bagus");
});

test("addGroupMemoryEntry stores quote entries and searches by tag", () => {
	const result = addGroupMemoryEntry(
		{},
		{
			type: "quote",
			text: "ini quote grup",
			authorJid: "628111@s.whatsapp.net",
			savedByName: "Admin",
			tags: ["lucu"],
			createdAt: 1,
		}
	);

	assert.equal(result.status, "ok");
	assert.equal(result.entry.id, 1);
	assert.equal(result.payload.nextId, 2);

	const entries = searchGroupMemoryEntries(result.payload, {
		type: "quote",
		tags: ["lucu"],
	});

	assert.equal(entries.length, 1);
	assert.equal(entries[0].text, "ini quote grup");
});

test("memory payload caps old entries and delete removes by id", () => {
	let payload = {};

	for (let i = 0; i < 105; i += 1) {
		payload = addGroupMemoryEntry(payload, {
			type: "memory",
			text: `memory ${i}`,
		}).payload;
	}

	const normalized = normalizeGroupMemoryPayload(payload);

	assert.equal(normalized.entries.length, 100);
	assert.equal(normalized.entries[0].text, "memory 5");

	const deleted = deleteGroupMemoryEntry(
		normalized,
		normalized.entries[0].id
	);

	assert.equal(deleted.status, "ok");
	assert.equal(deleted.payload.entries.length, 99);
});

test("formatters render list, detail, and random entries", () => {
	const result = addGroupMemoryEntry(
		{},
		{
			type: "memory",
			text: "Jangan lupa raid jam 8 malam",
			authorName: "Igyun",
			savedByName: "Igyun",
			tags: ["event"],
			createdAt: Date.UTC(2026, 5, 12, 12, 0, 0),
		}
	);
	const random = pickRandomGroupMemoryEntry(result.payload, {
		type: "memory",
	});
	const detail = formatGroupMemoryEntry(random, ".");
	const list = formatGroupMemoryList([random], "memory", ".");

	assert.match(detail, /Memory #1/);
	assert.match(detail, /Jangan lupa raid/);
	assert.match(detail, /#event/);
	assert.match(list, /Memory Grup/);
	assert.match(list, /Detail: \.memory <id>/);
});
