import {
	addGroupEvent,
	buildTopicSuggestion,
	formatGroupEventDetail,
	formatWelcomeMessage,
	getDueGroupEventReminders,
	getDueTopic,
	inferTopicCategory,
	markGroupEventNotified,
	markTopicSent,
	normalizeTopicConfig,
	normalizeWelcomeConfig,
	parseGroupEventInput,
} from "#lib/groupCommunity";
import assert from "node:assert/strict";
import test from "node:test";

test("welcome template renders group placeholders and mentions", () => {
	const config = normalizeWelcomeConfig({
		enabled: true,
		template:
			"Halo {mention}, welcome di {group}. {description} Coba {prefix}menu",
	});
	const message = formatWelcomeMessage(config, {
		participantJid: "628111222333@s.whatsapp.net",
		groupName: "Aetheria Tavern",
		description: "Grup diskusi RPG",
		prefix: ".",
	});

	assert.match(message.text, /@628111222333/);
	assert.match(message.text, /Aetheria Tavern/);
	assert.match(message.text, /Grup diskusi RPG/);
	assert.deepEqual(message.mentions, ["628111222333@s.whatsapp.net"]);
});

test("auto topic detects category and marks daily send", () => {
	const config = normalizeTopicConfig({
		enabled: true,
		time: "20:00",
	});
	const date = new Date("2026-06-12T13:02:00.000Z");
	const due = getDueTopic(config, date);

	assert.equal(
		inferTopicCategory({ groupName: "Aetheria RPG Guild" }),
		"rpg"
	);
	assert.equal(due.dayKey, "2026-06-12");

	const sent = markTopicSent(config, due.dayKey);
	assert.equal(getDueTopic(sent, date), null);

	const text = buildTopicSuggestion(config, {
		groupId: "120@g.us",
		groupName: "Aetheria RPG Guild",
		prefix: ".",
	});

	assert.match(text, /Topik Grup Hari Ini/);
	assert.match(text, /\.topik kategori/);
});

test("group event parser stores native-event ready agenda and reminders", () => {
	const now = new Date("2026-06-12T10:00:00.000Z");
	const parsed = parseGroupEventInput(
		"Raid Malam | besok 20:00 | Lawan boss bareng | Voice room | 90",
		now
	);

	assert.equal(parsed.status, "ok");
	assert.equal(parsed.event.startAt, Date.parse("2026-06-13T13:00:00.000Z"));

	const result = addGroupEvent({}, parsed.event);
	assert.equal(result.status, "ok");
	assert.equal(result.event.id, 1);

	const dueDate = new Date(parsed.event.startAt - 60 * 60 * 1000);
	const due = getDueGroupEventReminders(result.payload, dueDate);

	assert.equal(due.length, 1);
	assert.equal(due[0].minute, 60);

	const marked = markGroupEventNotified(
		result.payload,
		result.event.id,
		due[0].minute
	);
	assert.equal(getDueGroupEventReminders(marked, dueDate).length, 0);
	assert.match(formatGroupEventDetail(result.event, "."), /Raid Malam/);
});
