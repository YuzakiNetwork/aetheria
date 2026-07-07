import {
	CHANGELOG_ENTRIES,
	DEFAULT_NEWSLETTER_JID,
	formatNewsletterAnnouncement,
	formatUpdateDetail,
	formatUpdateDetailRichResponse,
	formatUpdateList,
	formatUpdateListRichResponse,
	resolveUpdateEntry,
} from "#lib/updates";
import assert from "node:assert/strict";
import test from "node:test";

test("CHANGELOG_ENTRIES exposes latest community update", () => {
	assert.ok(CHANGELOG_ENTRIES.length >= 4);
	assert.equal(CHANGELOG_ENTRIES[0].version, "WhatsApp Command Finder");
	assert.match(DEFAULT_NEWSLETTER_JID, /@newsletter$/);
});

test("formatUpdateList renders indexed changelog", () => {
	const text = formatUpdateList(".");

	assert.match(text, /\*Update Aetheria\*/);
	assert.match(text, /1\. \*WhatsApp Command Finder\*/);
	assert.match(text, /2\. \*Discord RPG Starter\*/);
	assert.match(text, /\.update latest/);
});

test("resolveUpdateEntry supports latest, numeric, and text lookup", () => {
	assert.equal(
		resolveUpdateEntry("latest")?.version,
		"WhatsApp Command Finder"
	);
	assert.equal(
		resolveUpdateEntry("rich response")?.version,
		"Rich Response Update Center"
	);
	assert.equal(resolveUpdateEntry("cloud")?.version, "Cloud Save");
	assert.equal(resolveUpdateEntry("tidak-ada"), null);
});

test("formatUpdateDetail renders latest detail with related commands", () => {
	const text = formatUpdateDetail(resolveUpdateEntry("latest"), ".");

	assert.match(text, /\*WhatsApp Command Finder\*/);
	assert.match(text, /\.fitur/);
	assert.match(text, /\.cari downloader/);
});

test("formatUpdateListRichResponse renders changelog table and link", () => {
	const payload = formatUpdateListRichResponse(".");

	assert.equal(payload.disclaimerText, "Aetheria Update Center");
	assert.equal(payload.title, "Changelog");
	assert.deepEqual(payload.table[0], ["No", "Update", "Tag"]);
	assert.equal(payload.table[1][1], "WhatsApp Command Finder");
	assert.match(payload.links[0].url, /\/changelog$/);
	assert.match(payload.fallbackText, /\.update latest/);
});

test("formatUpdateDetailRichResponse renders command table", () => {
	const payload = formatUpdateDetailRichResponse(
		resolveUpdateEntry("latest"),
		"."
	);

	assert.match(payload.headerText, /WhatsApp Command Finder/);
	assert.deepEqual(payload.table[0], ["Command", "Kegunaan"]);
	assert.ok(payload.table.some((row) => row[0] === ".fitur"));
	assert.match(payload.fallbackText, /\.cari downloader/);
});

test("formatNewsletterAnnouncement includes bot link and action commands", () => {
	const text = formatNewsletterAnnouncement({
		botNumber: "62881022374677",
		prefix: ".",
		websiteUrl: "https://aetheria.example",
	});

	assert.match(text, /DISCORD RPG STARTER/);
	assert.match(text, /\/start/);
	assert.match(text, /\/daily/);
	assert.match(text, /\/leaderboard/);
	assert.match(text, /https:\/\/wa\.me\/62881022374677\?text=\.update/);
	assert.match(text, /https:\/\/aetheria\.example\/changelog/);
});
