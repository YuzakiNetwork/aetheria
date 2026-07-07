import {
	formatReminderMessage,
	getDueReminderSlots,
	markReminderSent,
	normalizeReminderConfig,
	parseReminderTime,
	setReminderSlotTime,
} from "#lib/reminder";
import assert from "node:assert/strict";
import test from "node:test";

test("parseReminderTime normalizes valid HH:mm values", () => {
	assert.equal(parseReminderTime("7:05"), "07:05");
	assert.equal(parseReminderTime("23:59"), "23:59");
	assert.equal(parseReminderTime("24:00"), null);
	assert.equal(parseReminderTime("malam"), null);
});

test("getDueReminderSlots returns enabled slots inside local send window", () => {
	const config = normalizeReminderConfig({
		enabled: true,
		timezone: "Asia/Jakarta",
		slots: [
			{
				key: "pagi",
				time: "07:00",
			},
		],
	});
	const due = getDueReminderSlots(
		config,
		new Date("2026-06-01T00:02:00.000Z")
	);

	assert.equal(due.length, 1);
	assert.equal(due[0].key, "pagi");
	assert.equal(due[0].dayKey, "2026-06-01");
});

test("markReminderSent prevents duplicate slot on same local day", () => {
	const config = normalizeReminderConfig({
		enabled: true,
		timezone: "Asia/Jakarta",
		slots: [
			{
				key: "pagi",
				time: "07:00",
			},
		],
	});
	const sent = markReminderSent(config, "pagi", "2026-06-01");
	const due = getDueReminderSlots(sent, new Date("2026-06-01T00:03:00.000Z"));

	assert.equal(due.length, 0);
});

test("setReminderSlotTime updates configured slot", () => {
	const result = setReminderSlotTime(
		normalizeReminderConfig({ enabled: true }),
		"malam",
		"20:15"
	);

	assert.equal(result.status, "ok");
	assert.equal(
		result.config.slots.find((slot) => slot.key === "malam")?.time,
		"20:15"
	);
});

test("formatReminderMessage renders command calls to action", () => {
	const text = formatReminderMessage("malam", ".");

	assert.match(text, /Party Night Aetheria/);
	assert.match(text, /\.squad/);
	assert.match(text, /\.dungeon/);
	assert.match(text, /tanpa tag massal/);
});
