import {
	formatHallOfFameStatus,
	formatWeeklyHallOfFame,
	getHallOfFameWeekKey,
	shouldSendWeeklyHallOfFame,
} from "#lib/hallOfFame";
import assert from "node:assert/strict";
import test from "node:test";

const sampleEntries = [
	{
		name: "Astra",
		player: {
			level: 9,
			xp: 420,
			gold: 1200,
			wins: 12,
			jobs: 3,
			dailyStreak: {
				count: 6,
				best: 8,
			},
			activity: {
				wins: 12,
				jobs: 3,
			},
		},
	},
	{
		name: "Boreal",
		player: {
			level: 7,
			xp: 900,
			gold: 2400,
			wins: 4,
			jobs: 18,
			dailyStreak: {
				count: 3,
				best: 4,
			},
			activity: {
				wins: 4,
				jobs: 18,
			},
		},
	},
];

test("formatWeeklyHallOfFame renders ranking sections and bot link", () => {
	const text = formatWeeklyHallOfFame(sampleEntries, {
		botNumber: "62881022374677",
		now: new Date("2026-06-14T13:05:00.000Z"),
		prefix: ".",
	});

	assert.match(text, /Weekly Hall of Fame/);
	assert.match(text, /Top Adventurer/);
	assert.match(text, /Daily Streak/);
	assert.match(text, /Hunter Aktif/);
	assert.match(text, /Gold Holder/);
	assert.match(text, /Worker/);
	assert.match(text, /Astra/);
	assert.match(text, /Boreal/);
	assert.match(text, /https:\/\/wa\.me\/62881022374677\?text=\.hof/);
});

test("shouldSendWeeklyHallOfFame gates weekly send window", () => {
	const sundayNight = new Date("2026-06-14T13:05:00.000Z");
	const beforeWindow = new Date("2026-06-14T12:30:00.000Z");
	const weekKey = getHallOfFameWeekKey(sundayNight);

	assert.equal(weekKey, "2026-W24");
	assert.equal(
		shouldSendWeeklyHallOfFame({ now: sundayNight, settings: {} })
			.shouldSend,
		true
	);
	assert.equal(
		shouldSendWeeklyHallOfFame({ now: beforeWindow, settings: {} })
			.shouldSend,
		false
	);
	assert.equal(
		shouldSendWeeklyHallOfFame({
			now: sundayNight,
			settings: {
				weeklyHallOfFameLastSentWeek: weekKey,
			},
		}).shouldSend,
		false
	);
});

test("formatHallOfFameStatus exposes schedule and owner commands", () => {
	const text = formatHallOfFameStatus({
		weeklyHallOfFameLastSentWeek: "2026-W24",
		weeklyHallOfFameLastSentAt: new Date(
			"2026-06-14T13:05:00.000Z"
		).getTime(),
	});

	assert.match(text, /Minggu 20:00 WIB/);
	assert.match(text, /2026-W24/);
	assert.match(text, /\.hof send/);
	assert.match(text, /\.setting halloffame off/);
});
