import {
	ACHIEVEMENTS,
	PETS,
	TAVERN_TASKS,
	TITLES,
	buildBestiaryTable,
	formatBestiary,
	formatComebackStatus,
	formatDailyResult,
	formatDungeonResult,
	formatGearUpgradeResult,
	formatGearUpgradeStatus,
	formatPetStatus,
	formatPlayerGuide,
	formatPlayerProgress,
	formatProfile,
	formatQuestBoard,
	formatTavernBoard,
	formatTavernClaimResult,
	formatWorldBossAttackResult,
	formatWorldBossStatus,
} from "#lib/rpg";
import assert from "node:assert/strict";
import test from "node:test";

function createPlayer(overrides = {}) {
	return {
		name: "Tester",
		class: "warrior",
		race: "slime",
		zone: "padang_awan",
		level: 1,
		xp: 0,
		gold: 100,
		hp: 125,
		energy: 100,
		maxEnergy: 100,
		stats: {
			maxHp: 125,
			attack: 12,
			defense: 9,
			agility: 4,
		},
		items: {
			potion: 2,
		},
		gear: {
			weapon: "training_sword",
			armor: null,
			charm: null,
		},
		gearUpgrades: {
			weapon: 0,
			armor: 0,
			charm: 0,
		},
		skills: {
			owned: {},
			equipped: [],
		},
		wins: 0,
		losses: 0,
		jobs: 0,
		activity: {
			wins: 0,
			jobs: 0,
			crafts: 0,
			sells: 0,
			buys: 0,
			dailies: 0,
			heals: 0,
			upgrades: 0,
		},
		quests: {},
		achievements: {
			unlocked: {},
		},
		titles: {
			owned: {},
			equipped: null,
		},
		pets: {
			owned: {},
			equipped: null,
		},
		...overrides,
	};
}

test("achievement title rewards reference valid title definitions", () => {
	for (const achievement of Object.values(ACHIEVEMENTS)) {
		if (!achievement.title) {
			continue;
		}

		assert.ok(TITLES[achievement.title], achievement.key);
	}
});

test("formatProfile shows equipped achievement title", () => {
	const player = createPlayer({
		achievements: {
			unlocked: {
				first_steps: 1,
			},
		},
		titles: {
			owned: {
				rookie_adventurer: 1,
			},
			equipped: "rookie_adventurer",
		},
	});

	const text = formatProfile(player, ".");

	assert.match(text, /Title: \*Rookie Adventurer\*/);
	assert.match(text, /Achievement: \*1\//);
});

test("formatProfile shows equipped pet", () => {
	const player = createPlayer({
		pets: {
			owned: {
				wolf_cub: {
					level: 2,
					shards: 0,
				},
			},
			equipped: "wolf_cub",
		},
	});

	const text = formatProfile(player, ".");

	assert.match(text, /Pet: \*🐺 Wolf Cub Lv 2\*/);
});

test("formatProfile shows gear upgrade summary", () => {
	const player = createPlayer({
		gearUpgrades: {
			weapon: 2,
			armor: 1,
			charm: 0,
		},
	});

	const text = formatProfile(player, ".");

	assert.match(text, /Gear Upgrade: \*W\+2 A\+1 C\+0\*/);
	assert.match(text, /ATK \*17\*/);
});

test("formatProfile shows daily streak summary", () => {
	const player = createPlayer({
		dailyStreak: {
			count: 4,
			best: 6,
			lastClaimAt: 1,
		},
	});

	const text = formatProfile(player, ".");

	assert.match(text, /Daily Streak: \*4 hari \(best 6\)\*/);
});

test("formatDailyResult renders streak bonus", () => {
	const text = formatDailyResult({
		player: createPlayer(),
		rewards: {
			gold: 245,
			xp: 89,
			potion: 1,
			levels: [],
			streak: {
				count: 3,
				best: 3,
				lastClaimAt: 1,
			},
			streakBonus: {
				gold: 40,
				xp: 16,
				items: {
					ether: 1,
				},
			},
		},
	});

	assert.match(text, /Daily Streak/);
	assert.match(text, /Hari ke-\*3\*/);
	assert.match(text, /Ether x1/);
});

test("formatDailyResult renders comeback supply bonus", () => {
	const text = formatDailyResult({
		player: createPlayer(),
		rewards: {
			gold: 525,
			xp: 160,
			potion: 1,
			levels: [],
			streak: {
				count: 1,
				best: 3,
				lastClaimAt: 1,
			},
			streakBonus: {
				gold: 0,
				xp: 0,
				items: {},
			},
			comeback: {
				name: "Return Supply",
				inactiveDays: 5,
				gold: 290,
				xp: 108,
				items: {
					ether: 1,
					potion: 1,
				},
			},
		},
	});

	assert.match(text, /Return Supply/);
	assert.match(text, /Absen \*5 hari\*/);
	assert.match(text, /Ether x1/);
	assert.match(text, /Potion x1/);
});

test("formatComebackStatus points returning players to the recovery loop", () => {
	const now = Date.now();
	const text = formatComebackStatus(
		createPlayer({
			lastDaily: now - 5 * 24 * 60 * 60 * 1000,
		}),
		"."
	);

	assert.match(text, /Return Supply siap/);
	assert.match(text, /\.daily/);
	assert.match(text, /\.tavern claim/);
	assert.match(text, /\.rpg/);
});

test("tavern task rewards reference valid material or shop item keys", () => {
	for (const task of Object.values(TAVERN_TASKS)) {
		assert.ok(task.key);
		assert.ok(["daily", "weekly"].includes(task.type));
		assert.ok(task.target > 0);
		assert.ok(task.rewards.gold >= 0);
		assert.ok(task.rewards.xp >= 0);
	}
});

test("formatTavernBoard renders ready daily and weekly tasks", () => {
	const text = formatTavernBoard(
		{
			player: createPlayer(),
			tasks: [
				{
					...TAVERN_TASKS.tavern_daily_checkin,
					progress: 1,
					ready: true,
					done: true,
					claimed: false,
					remainingMs: 3600000,
				},
				{
					...TAVERN_TASKS.tavern_weekly_active,
					progress: 7,
					ready: false,
					done: false,
					claimed: false,
					remainingMs: 86400000,
				},
			],
		},
		"."
	);

	assert.match(text, /Tavern Board/);
	assert.match(text, /Buka Hari/);
	assert.match(text, /Tavern Regular/);
	assert.match(text, /\.tavern claim/);
});

test("formatTavernClaimResult renders claimed rewards", () => {
	const text = formatTavernClaimResult(
		{
			player: createPlayer(),
			claimed: [
				{
					task: TAVERN_TASKS.tavern_daily_checkin,
					rewards: {
						gold: 70,
						xp: 22,
						items: {
							potion: 1,
						},
						levels: [],
					},
				},
			],
		},
		"."
	);

	assert.match(text, /Tavern Reward/);
	assert.match(text, /Buka Hari/);
	assert.match(text, /Potion x1/);
});

test("formatPlayerGuide renders state-aware next actions", () => {
	const text = formatPlayerGuide(createPlayer(), ".");

	assert.match(text, /Aetheria Guide Tester/);
	assert.match(text, /Klaim Reward Misi/);
	assert.match(text, /\.misi claim/);
	assert.match(text, /\.tavern/);
	assert.match(text, /\.upgrade weapon/);
});

test("formatPlayerProgress renders RPG checklist", () => {
	const text = formatPlayerProgress(
		createPlayer({
			level: 5,
			gearUpgrades: {
				weapon: 1,
				armor: 0,
				charm: 0,
			},
			pets: {
				owned: {
					wolf_cub: {
						level: 1,
						shards: 0,
					},
				},
				equipped: "wolf_cub",
			},
		}),
		"."
	);

	assert.match(text, /Progress Aetheria Tester/);
	assert.match(text, /Quest Pemula/);
	assert.match(text, /Gear Upgrade/);
	assert.match(text, /Companion/);
	assert.match(text, /\.guide/);
});

test("formatGearUpgradeStatus renders slot costs and actions", () => {
	const text = formatGearUpgradeStatus(
		{
			player: createPlayer({
				items: {
					ore: 3,
					potion: 2,
				},
			}),
		},
		"."
	);

	assert.match(text, /Gear Upgrade Tester/);
	assert.match(text, /\*Weapon\* \+0\/5/);
	assert.match(text, /Next: 140 gold, Ore x3/);
	assert.match(text, /\.upgrade weapon/);
});

test("formatGearUpgradeResult renders successful upgrade", () => {
	const text = formatGearUpgradeResult(
		{
			status: "ok",
			player: createPlayer({
				gold: 60,
				gearUpgrades: {
					weapon: 1,
				},
			}),
			rule: {
				name: "Weapon",
			},
			slot: "weapon",
			gearName: "Training Sword",
			oldLevel: 0,
			newLevel: 1,
			cost: {
				gold: 140,
				items: {
					ore: 3,
				},
			},
		},
		"."
	);

	assert.match(text, /Gear Berhasil Ditempa/);
	assert.match(text, /Weapon \+0 -> \+1/);
	assert.match(text, /ATK \+2/);
});

test("formatPetStatus renders owned and locked pets", () => {
	const text = formatPetStatus(
		{
			summary: {
				owned: 1,
				total: Object.keys(PETS).length,
			},
			equippedPet: {
				key: "wolf_cub",
				name: "Wolf Cub",
				icon: "🐺",
				level: 1,
				bonuses: {
					attack: 2,
				},
			},
			pets: [
				{
					key: "wolf_cub",
					name: "Wolf Cub",
					icon: "🐺",
					owned: true,
					equipped: true,
					level: 1,
					shards: 0,
					bonuses: {
						attack: 2,
					},
				},
				{
					key: "mini_slime",
					name: "Mini Slime",
					icon: "🫧",
					owned: false,
					equipped: false,
					level: 1,
					shards: 0,
					bonuses: {
						defense: 2,
					},
				},
			],
		},
		"."
	);

	assert.match(text, /Companion Aetheria/);
	assert.match(text, /Wolf Cub/);
	assert.match(text, /Belum punya/);
});

test("formatQuestBoard renders beginner quest section", () => {
	const text = formatQuestBoard(
		{
			quests: [
				{
					key: "beginner_register",
					type: "beginner",
					name: "Langkah Pertama",
					description: "Buat karakter RPG pertamamu.",
					progress: 1,
					target: 1,
					ready: true,
					claimed: false,
					rewards: {
						gold: 50,
						xp: 20,
						items: {
							potion: 1,
						},
					},
				},
			],
		},
		"."
	);

	assert.match(text, /Pemula/);
	assert.match(text, /beginner_register/);
	assert.match(text, /Siap claim/);
});

test("formatBestiary renders monster stats and absorb skills", () => {
	const result = {
		status: "ok",
		activeZoneKey: "padang_awan",
		zones: [
			{
				key: "padang_awan",
				name: "Padang Awan",
				minLevel: 1,
				monsters: [
					{
						name: "Slime",
						hp: 42,
						attack: 8,
						defense: 2,
						agility: 2,
						skill: "acid_touch",
						absorbChance: 0.2,
					},
				],
			},
		],
	};
	const text = formatBestiary(result, ".");
	const table = buildBestiaryTable(result, ".");

	assert.match(text, /Bestiary Aetheria/);
	assert.match(text, /Padang Awan/);
	assert.match(text, /HP 42/);
	assert.match(text, /Acid Touch/);
	assert.match(text, /\.jelajah/);
	assert.equal(table.title, "Monster Stats");
	assert.deepEqual(table.table[1], [
		"Slime",
		"42",
		"8",
		"2",
		"2",
		"Acid Touch 20%",
	]);
});

test("formatDungeonResult renders cleared squad dungeon rewards", () => {
	const text = formatDungeonResult(
		{
			status: "cleared",
			energyCost: 18,
			cooldown: 12 * 60 * 60 * 1000,
			squad: {
				squad: {
					name: "Aether Squad",
					max_members: 4,
				},
			},
			dungeon: {
				name: "Reruntuhan Awan",
				subtitle: "Dungeon pembuka untuk squad baru",
				rooms: [{ name: "Gerbang Retak" }],
			},
			simulation: {
				cleared: 1,
				rooms: [
					{
						name: "Gerbang Retak",
						success: true,
						rollPower: 120,
						target: 90,
					},
				],
			},
			rewards: [
				{
					name: "Tester",
					reward: {
						gold: 120,
						xp: 80,
						items: {
							herb: 1,
						},
						levels: [],
					},
				},
			],
		},
		"."
	);

	assert.match(text, /Dungeon Selesai/);
	assert.match(text, /Reruntuhan Awan/);
	assert.match(text, /Tester/);
	assert.match(text, /\.misi harian/);
});

test("formatWorldBossStatus renders active boss and attack command", () => {
	const text = formatWorldBossStatus(
		{
			status: "active",
			remaining: 600000,
			boss: {
				name: "Ember Drake",
				subtitle: "Api tua dari Padang Awan",
				icon: "🐉",
				level: 4,
				hp: 1200,
				maxHp: 2200,
				participants: {
					"123@s.whatsapp.net": {
						name: "Tester",
						damage: 300,
						attacks: 2,
					},
				},
			},
		},
		"."
	);

	assert.match(text, /Ember Drake/);
	assert.match(text, /\.serangboss/);
	assert.match(text, /Tester/);
});

test("formatWorldBossAttackResult renders defeated rewards", () => {
	const text = formatWorldBossAttackResult(
		{
			status: "defeated",
			remaining: 600000,
			attack: {
				damage: 200,
				counterDamage: 5,
				energyCost: 10,
			},
			boss: {
				name: "Ember Drake",
				icon: "🐉",
				hp: 0,
				maxHp: 2200,
				participants: {},
			},
			rewards: [
				{
					rank: 1,
					killer: true,
					participant: {
						name: "Tester",
					},
					reward: {
						gold: 120,
						xp: 60,
						items: {
							hi_potion: 1,
						},
						levels: [],
					},
				},
			],
		},
		"."
	);

	assert.match(text, /World Boss Tumbang/);
	assert.match(text, /Reward/);
	assert.match(text, /Tester/);
});
