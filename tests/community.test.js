import {
	buildWaMeLink,
	formatFeedbackAck,
	formatFeedbackReport,
	formatInviteMessage,
	formatOwnerOps,
	formatPublicStatus,
	formatPublicStatusRichResponse,
	getBotMode,
	normalizeJidNumber,
} from "#lib/community";
import assert from "node:assert/strict";
import test from "node:test";

test("normalizeJidNumber extracts phone number from jid", () => {
	assert.equal(
		normalizeJidNumber("62881022374677@s.whatsapp.net"),
		"62881022374677"
	);
	assert.equal(normalizeJidNumber("abc"), "");
});

test("buildWaMeLink encodes prefilled command", () => {
	assert.equal(
		buildWaMeLink("62881022374677", ".rpg"),
		"https://wa.me/62881022374677?text=.rpg"
	);
});

test("getBotMode resolves exclusive runtime mode", () => {
	assert.equal(getBotMode({ self: true }), "self");
	assert.equal(getBotMode({ groupOnly: true }), "group only");
	assert.equal(getBotMode({ privateChatOnly: true }), "private only");
	assert.equal(getBotMode({}), "public");
});

test("formatPublicStatus includes command summary and public links", () => {
	const text = formatPublicStatus({
		botNumber: "62881022374677",
		brand: {
			name: "Aetheria",
			description: "WhatsApp adventure bot",
		},
		memory: {
			heapUsed: 1048576,
			rss: 2097152,
		},
		plugins: [
			{ category: "info", command: ["help"] },
			{ category: "community", command: ["feedback"] },
			{ category: "owner", command: ["ops"], owner: true },
			{ category: "tools", command: ["secret"], hidden: true },
		],
		prefix: ".",
		queueStatus: { totalQueues: 2 },
		settings: {},
		uptimeMs: 61000,
		websiteUrl: "https://aetheria.example",
	});

	assert.match(text, /\*Aetheria Status\*/);
	assert.match(text, /Command publik: \*2\*/);
	assert.match(text, /Kategori: \*2\*/);
	assert.match(text, /Queue aktif: \*2\*/);
	assert.match(text, /\.update/);
	assert.match(text, /\.tavern/);
	assert.match(text, /\.invite/);
	assert.match(text, /\.donasi/);
	assert.match(text, /https:\/\/wa\.me\/62881022374677\?text=\.rpg/);
	assert.match(text, /https:\/\/aetheria\.example/);
});

test("formatPublicStatusRichResponse renders runtime table and links", () => {
	const payload = formatPublicStatusRichResponse({
		botNumber: "62881022374677",
		brand: {
			name: "Aetheria",
			description: "WhatsApp adventure bot",
		},
		memory: {
			heapUsed: 1048576,
			rss: 2097152,
		},
		plugins: [
			{ category: "info", command: ["help"] },
			{ category: "community", command: ["feedback"] },
			{ category: "owner", command: ["ops"], owner: true },
		],
		prefix: ".",
		queueStatus: { totalQueues: 2 },
		settings: {},
		uptimeMs: 61000,
		websiteUrl: "https://aetheria.example",
	});

	assert.equal(payload.disclaimerText, "Aetheria Status");
	assert.equal(payload.title, "Runtime");
	assert.deepEqual(payload.table[0], ["Metric", "Value"]);
	assert.ok(payload.table.some((row) => row[0] === "Command publik"));
	assert.match(payload.links[0].url, /https:\/\/wa\.me\/62881022374677/);
	assert.match(payload.links[1].url, /https:\/\/aetheria\.example/);
	assert.match(payload.fallbackText, /\.tavern/);
	assert.match(payload.footerText, /\.donasi/);
});

test("formatInviteMessage renders shareable bot invite", () => {
	const text = formatInviteMessage({
		botNumber: "62881022374677",
		prefix: ".",
		websiteUrl: "https://aetheria.example",
	});

	assert.match(text, /Main Aetheria di WhatsApp/);
	assert.match(text, /\.rpg/);
	assert.match(text, /\.invite/);
	assert.match(text, /\.donasi/);
	assert.match(text, /https:\/\/wa\.me\/62881022374677\?text=\.rpg/);
	assert.match(text, /https:\/\/aetheria\.example/);
});

test("formatFeedbackReport renders owner-readable report", () => {
	const text = formatFeedbackReport({
		chatJid: "120363123@g.us",
		chatName: "Aetheria Tavern",
		command: "bug",
		isGroup: true,
		senderJid: "6281234567890@s.whatsapp.net",
		senderName: "Igyun",
		text: "Tombol dungeon tidak muncul.",
		timestamp: new Date("2026-06-03T06:00:00.000Z"),
	});

	assert.match(text, /\*Bug Report Aetheria\*/);
	assert.match(text, /Igyun/);
	assert.match(text, /Aetheria Tavern/);
	assert.match(text, /Tombol dungeon tidak muncul/);
	assert.match(text, /https:\/\/wa\.me\/6281234567890/);
});

test("formatFeedbackAck includes owner count", () => {
	assert.match(formatFeedbackAck("saran", 2), /Owner tujuan: 2/);
});

test("formatOwnerOps renders queue and database summary", () => {
	const text = formatOwnerOps({
		groupCount: 4,
		groupsBanned: 1,
		memory: {
			heapUsed: 1048576,
			rss: 2097152,
		},
		ownerCount: 1,
		plugins: [{ category: "info" }, { category: "owner", owner: true }],
		queueStatus: {
			totalQueues: 1,
			queues: [{ jid: "628123@s.whatsapp.net", count: 2 }],
		},
		settings: { groupOnly: true },
		uptimeMs: 60000,
		userCount: 12,
		usersBanned: 2,
		usersPremium: 3,
	});

	assert.match(text, /Mode: \*group only\*/);
	assert.match(text, /User: 12 \(3 premium, 2 banned\)/);
	assert.match(text, /Grup: 4 \(1 banned\)/);
	assert.match(text, /628123@s\.whatsapp\.net: 2/);
});
