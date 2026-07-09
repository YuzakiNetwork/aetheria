import {
	appendInteractiveSuffix,
	formatButtonsAsText,
	formatSectionsAsText,
} from "#utils/interactiveText";
import assert from "node:assert/strict";
import test from "node:test";

test("formatButtonsAsText returns empty for non-array", () => {
	assert.equal(formatButtonsAsText(), "");
	assert.equal(formatButtonsAsText("hello"), "");
	assert.equal(formatButtonsAsText(42), "");
});

test("formatButtonsAsText formats numeric index with id suffix", () => {
	const out = formatButtonsAsText([
		{ text: "Misi", id: "!misi" },
		{ text: "Pulang", id: "!pulang" },
	]);

	assert.match(out, /^1\. Misi — `!misi`$/m);
	assert.match(out, /^2\. Pulang — `!pulang`$/m);
});

test("formatButtonsAsText skips buttons without text", () => {
	const out = formatButtonsAsText([
		{ text: "Valid", id: "v1" },
		{ text: "", id: "blank-id" },
		{ id: "no-text" },
		null,
	]);

	assert.equal(out, "1. Valid — `v1`");
});

test("formatSectionsAsText renders title + rows", () => {
	const out = formatSectionsAsText([
		{
			title: "Kategori",
			rows: [
				{ title: "Pemula", id: "!pemula", description: "Lv 1-5" },
				{ title: "Menengah", id: "!menengah" },
			],
		},
		{ title: "kosong", rows: [] },
	]);

	assert.match(out, /^\*Kategori\*$/m);
	assert.match(out, /^1\. Pemula — `!pemula`$/m);
	assert.match(out, /^2\. Menengah — `!menengah`$/m);
	assert.equal(out.includes("kosong"), false);
});

test("formatSectionsAsText skips malformed rows", () => {
	const out = formatSectionsAsText([
		{
			title: "S",
			rows: [{ id: "ok" }, { title: "no id", text: "x" }],
		},
	]);

	assert.match(out, /^1\. kode: `ok`$/m);
	// rows that have only a title (no id) should still render, but rows
	// missing both fields should be dropped.
	assert.match(out, /^2\. no id$/m);
});

test("appendInteractiveSuffix leaves text alone when no payload survives", () => {
	assert.equal(appendInteractiveSuffix("Halo", {}), "Halo");
	assert.equal(appendInteractiveSuffix("Halo", { buttons: [] }), "Halo");
});

test("appendInteractiveSuffix appends button list plus hint", () => {
	const out = appendInteractiveSuffix("Pilih opsi", {
		buttons: [{ text: "Misi", id: "!misi" }],
	});

	assert.ok(out.startsWith("Pilih opsi\n\n"));
	assert.ok(out.includes("1. Misi — `!misi`"));
	assert.match(out, /Balas dengan kode/);
});

test("appendInteractiveSuffix merges buttons and sections with separator", () => {
	const out = appendInteractiveSuffix("Menu", {
		buttons: [{ text: "Bantuan", id: "!help" }],
		sections: [
			{
				title: "Kategori",
				rows: [{ title: "Pemula", id: "!pemula" }],
			},
		],
	});

	assert.ok(out.startsWith("Menu"));
	assert.ok(out.includes("1. Bantuan — `!help`"));
	assert.ok(out.includes("*Kategori*"));
	assert.ok(out.includes("1. Pemula — `!pemula`"));
});

test("appendInteractiveSuffix accepts hint: false to suppress trailing copy hint", () => {
	const out = appendInteractiveSuffix(
		"Pilih",
		{ buttons: [{ text: "A", id: "!a" }] },
		{ hint: false }
	);

	assert.ok(!out.includes("untuk memilih"));
});
