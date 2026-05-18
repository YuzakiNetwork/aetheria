import { BRAND_CONFIG } from "#config/brand";
import * as db from "#lib/database/index";
import {
	bindWhatsAppToUser,
	getLatestCompletedRestoreSession,
	markRestoreSessionRestored,
} from "#lib/supabase/accountLinking";
import { getGuildStatusByWhatsApp } from "#lib/supabase/guilds";
import {
	createPremiumSnapshot,
	getPremiumStatusByWhatsApp,
} from "#lib/supabase/monetization";
import {
	getCloudRpgProfileByUserId,
	getRpgLeaderboard,
	getRpgPlayerByWhatsApp,
	syncRpgProfileSnapshot,
} from "#lib/supabase/rpgProfiles";
import { getSquadByWhatsApp } from "#lib/supabase/squads";

const RPG_VERSION = 1;
const DAY_MS = 24 * 60 * 60 * 1000;
const ENERGY_REGEN_MS = 10 * 60 * 1000;
const HP_REGEN_MS = 5 * 60 * 1000;

export const STARTER_CLASSES = {
	warrior: {
		name: "Warrior",
		description: "HP tebal, stabil buat duel panjang.",
		weapon: "training_sword",
		stats: {
			maxHp: 125,
			attack: 12,
			defense: 9,
			agility: 4,
		},
		growth: {
			maxHp: 13,
			attack: 3,
			defense: 3,
			agility: 1,
		},
	},
	rogue: {
		name: "Rogue",
		description: "Cepat, sering dodge, damage tajam.",
		weapon: "training_dagger",
		stats: {
			maxHp: 95,
			attack: 15,
			defense: 5,
			agility: 10,
		},
		growth: {
			maxHp: 9,
			attack: 4,
			defense: 1,
			agility: 3,
		},
	},
	mage: {
		name: "Mage",
		description: "Damage tinggi, rapuh kalau HP dibiarkan turun.",
		weapon: "training_staff",
		stats: {
			maxHp: 85,
			attack: 18,
			defense: 4,
			agility: 6,
		},
		growth: {
			maxHp: 8,
			attack: 5,
			defense: 1,
			agility: 2,
		},
	},
	ranger: {
		name: "Ranger",
		description: "Seimbang, akurat, cocok buat farming.",
		weapon: "training_bow",
		stats: {
			maxHp: 105,
			attack: 13,
			defense: 6,
			agility: 8,
		},
		growth: {
			maxHp: 10,
			attack: 3,
			defense: 2,
			agility: 3,
		},
	},
};

const CLASS_ALIASES = {
	fighter: "warrior",
	ksatria: "warrior",
	prajurit: "warrior",
	assassin: "rogue",
	ninja: "rogue",
	penyihir: "mage",
	wizard: "mage",
	archer: "ranger",
	pemanah: "ranger",
};

export const SHOP_ITEMS = {
	training_sword: {
		name: "Training Sword",
		type: "gear",
		slot: "weapon",
		hidden: true,
		bonuses: {
			attack: 1,
		},
	},
	training_dagger: {
		name: "Training Dagger",
		type: "gear",
		slot: "weapon",
		hidden: true,
		bonuses: {
			attack: 1,
			agility: 1,
		},
	},
	training_staff: {
		name: "Training Staff",
		type: "gear",
		slot: "weapon",
		hidden: true,
		bonuses: {
			attack: 2,
		},
	},
	training_bow: {
		name: "Training Bow",
		type: "gear",
		slot: "weapon",
		hidden: true,
		bonuses: {
			attack: 1,
			agility: 1,
		},
	},
	potion: {
		name: "Potion",
		type: "consumable",
		price: 55,
		description: "Pulihkan 45 HP.",
	},
	ether: {
		name: "Ether",
		type: "consumable",
		price: 95,
		description: "Pulihkan 25 energi.",
	},
	iron_sword: {
		name: "Iron Sword",
		type: "gear",
		slot: "weapon",
		price: 320,
		level: 2,
		description: "+7 ATK.",
		bonuses: {
			attack: 7,
		},
	},
	steel_blade: {
		name: "Steel Blade",
		type: "gear",
		slot: "weapon",
		price: 760,
		level: 5,
		description: "+15 ATK, +2 AGI.",
		bonuses: {
			attack: 15,
			agility: 2,
		},
	},
	iron_armor: {
		name: "Iron Armor",
		type: "gear",
		slot: "armor",
		price: 420,
		level: 3,
		description: "+8 DEF, +20 HP.",
		bonuses: {
			defense: 8,
			maxHp: 20,
		},
	},
	hunter_charm: {
		name: "Hunter Charm",
		type: "gear",
		slot: "charm",
		price: 640,
		level: 4,
		description: "+3 ATK, +5 AGI.",
		bonuses: {
			attack: 3,
			agility: 5,
		},
	},
};

const ITEM_ALIASES = {
	obat: "potion",
	pot: "potion",
	ramuan: "potion",
	energi: "ether",
	energy: "ether",
	pedang: "iron_sword",
	iron: "iron_sword",
	besi: "iron_sword",
	steel: "steel_blade",
	armor: "iron_armor",
	zirah: "iron_armor",
	charm: "hunter_charm",
	jimat: "hunter_charm",
	ore: "ore",
	batu: "ore",
	bijih: "ore",
	herb: "herb",
	daun: "herb",
	fish: "fish",
	ikan: "fish",
};

export const MATERIALS = {
	ore: {
		name: "Ore",
		sellPrice: 18,
		description: "Material untuk craft gear.",
	},
	herb: {
		name: "Herb",
		sellPrice: 14,
		description: "Material untuk craft potion dan ether.",
	},
	fish: {
		name: "Fish",
		sellPrice: 16,
		description: "Material dagang dan beberapa recipe.",
	},
};

export const CRAFTING_RECIPES = {
	potion: {
		name: "Potion Pack",
		output: "potion",
		quantity: 2,
		gold: 15,
		requires: {
			herb: 3,
		},
		description: "Potion x2.",
	},
	ether: {
		name: "Ether",
		output: "ether",
		quantity: 1,
		gold: 25,
		requires: {
			herb: 2,
			ore: 1,
		},
		description: "Ether x1.",
	},
	iron_sword: {
		name: "Iron Sword",
		output: "iron_sword",
		quantity: 1,
		level: 2,
		gold: 180,
		requires: {
			ore: 6,
		},
		description: "Weapon Lv 2.",
	},
	iron_armor: {
		name: "Iron Armor",
		output: "iron_armor",
		quantity: 1,
		level: 3,
		gold: 220,
		requires: {
			ore: 8,
			herb: 2,
		},
		description: "Armor Lv 3.",
	},
	hunter_charm: {
		name: "Hunter Charm",
		output: "hunter_charm",
		quantity: 1,
		level: 4,
		gold: 260,
		requires: {
			ore: 4,
			herb: 5,
			fish: 2,
		},
		description: "Charm Lv 4.",
	},
	steel_blade: {
		name: "Steel Blade",
		output: "steel_blade",
		quantity: 1,
		level: 5,
		gold: 420,
		requires: {
			ore: 12,
			herb: 3,
		},
		description: "Weapon Lv 5.",
	},
};

const JOBS = {
	mine: {
		name: "Nambang",
		aliases: ["tambang", "nambang", "mine", "mining"],
		item: "ore",
		itemName: "Ore",
		gold: [65, 115],
		xp: [24, 42],
	},
	forage: {
		name: "Gathering",
		aliases: ["gather", "gathering", "cari", "forage", "herb"],
		item: "herb",
		itemName: "Herb",
		gold: [45, 95],
		xp: [22, 38],
	},
	fish: {
		name: "Mancing",
		aliases: ["fish", "fishing", "mancing", "ikan"],
		item: "fish",
		itemName: "Fish",
		gold: [50, 105],
		xp: [20, 36],
	},
};

const ZONES = [
	{
		key: "padang_awan",
		name: "Padang Awan",
		aliases: ["padang", "awan", "meadow", "awal"],
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
			{
				name: "Goblin",
				hp: 52,
				attack: 10,
				defense: 3,
				agility: 4,
				skill: "goblin_trick",
				absorbChance: 0.18,
			},
			{
				name: "Wolf",
				hp: 48,
				attack: 11,
				defense: 2,
				agility: 7,
				skill: "hunt_sense",
				absorbChance: 0.18,
			},
		],
	},
	{
		key: "hutan_lumina",
		name: "Hutan Lumina",
		aliases: ["hutan", "lumina", "forest"],
		minLevel: 4,
		monsters: [
			{
				name: "Treant",
				hp: 82,
				attack: 14,
				defense: 8,
				agility: 2,
				skill: "bark_skin",
				absorbChance: 0.16,
			},
			{
				name: "Bandit",
				hp: 74,
				attack: 17,
				defense: 5,
				agility: 7,
				skill: "shadow_step",
				absorbChance: 0.15,
			},
			{
				name: "Moon Wolf",
				hp: 68,
				attack: 18,
				defense: 4,
				agility: 10,
				skill: "hunt_sense",
				absorbChance: 0.22,
			},
		],
	},
	{
		key: "gua_arka",
		name: "Gua Arka",
		aliases: ["gua", "arka", "cave"],
		minLevel: 8,
		monsters: [
			{
				name: "Stone Golem",
				hp: 124,
				attack: 22,
				defense: 14,
				agility: 2,
				skill: "stone_skin",
				absorbChance: 0.15,
			},
			{
				name: "Crystal Bat",
				hp: 92,
				attack: 24,
				defense: 7,
				agility: 14,
				skill: "crystal_focus",
				absorbChance: 0.15,
			},
			{
				name: "Cave Knight",
				hp: 108,
				attack: 25,
				defense: 11,
				agility: 8,
				skill: "iron_will",
				absorbChance: 0.15,
			},
		],
	},
];

export const RACES = {
	slime: {
		name: "Slime",
		rank: "F",
		title: "Nameless Core",
		description: "Bentuk awal yang fleksibel dan mudah beradaptasi.",
		bonuses: {
			maxHp: 5,
			agility: 1,
		},
		next: ["greater_slime"],
	},
	greater_slime: {
		name: "Greater Slime",
		rank: "E",
		title: "Awakened Core",
		description: "Tubuh lebih stabil, cocok untuk menyerap skill liar.",
		bonuses: {
			maxHp: 16,
			attack: 2,
			defense: 1,
			agility: 2,
		},
		requires: {
			level: 3,
			wins: 3,
			gold: 120,
			items: {
				herb: 2,
			},
		},
		next: ["mimic_slime", "storm_slime"],
	},
	mimic_slime: {
		name: "Mimic Slime",
		rank: "D",
		title: "Skill Eater",
		description: "Fokus ke adaptasi tubuh dan serangan jarak dekat.",
		bonuses: {
			maxHp: 24,
			attack: 5,
			defense: 2,
			agility: 3,
		},
		requires: {
			level: 7,
			wins: 10,
			gold: 360,
			items: {
				ore: 4,
				herb: 4,
			},
			skills: ["acid_touch"],
		},
		next: ["arc_slime"],
	},
	storm_slime: {
		name: "Storm Slime",
		rank: "D",
		title: "Storm Runner",
		description: "Fokus ke kecepatan, dodge, dan burst damage.",
		bonuses: {
			maxHp: 18,
			attack: 4,
			defense: 1,
			agility: 7,
		},
		requires: {
			level: 7,
			wins: 10,
			gold: 360,
			items: {
				ore: 3,
				fish: 3,
			},
			skills: ["hunt_sense"],
		},
		next: ["arc_slime"],
	},
	arc_slime: {
		name: "Arc Slime",
		rank: "C",
		title: "Arc Core",
		description: "Inti berevolusi dan mulai membentuk aura penguasa.",
		bonuses: {
			maxHp: 42,
			attack: 8,
			defense: 5,
			agility: 6,
		},
		requires: {
			level: 12,
			wins: 24,
			gold: 900,
			items: {
				ore: 8,
				herb: 6,
				fish: 4,
			},
			skills: ["predator_instinct"],
		},
		next: [],
	},
};

export const SKILLS = {
	acid_touch: {
		name: "Acid Touch",
		type: "normal",
		source: "Slime",
		description: "Serangan asam sederhana. Naik level saat diserap ulang.",
		bonuses: {
			attack: 2,
		},
	},
	goblin_trick: {
		name: "Goblin Trick",
		type: "normal",
		source: "Goblin",
		description: "Gerak licik yang menambah peluang bertahan.",
		bonuses: {
			defense: 1,
			agility: 2,
		},
	},
	hunt_sense: {
		name: "Hunt Sense",
		type: "normal",
		source: "Wolf",
		description: "Insting berburu untuk damage dan kecepatan.",
		bonuses: {
			attack: 1,
			agility: 2,
		},
	},
	bark_skin: {
		name: "Bark Skin",
		type: "normal",
		source: "Treant",
		description: "Kulit mengeras seperti batang pohon.",
		bonuses: {
			maxHp: 8,
			defense: 2,
		},
	},
	shadow_step: {
		name: "Shadow Step",
		type: "normal",
		source: "Bandit",
		description: "Langkah cepat untuk menghindari serangan.",
		bonuses: {
			agility: 3,
		},
	},
	stone_skin: {
		name: "Stone Skin",
		type: "normal",
		source: "Stone Golem",
		description: "Pertahanan keras dari monster batu.",
		bonuses: {
			maxHp: 10,
			defense: 3,
		},
	},
	crystal_focus: {
		name: "Crystal Focus",
		type: "normal",
		source: "Crystal Bat",
		description: "Fokus kristal yang memperkuat serangan.",
		bonuses: {
			attack: 3,
			agility: 1,
		},
	},
	iron_will: {
		name: "Iron Will",
		type: "normal",
		source: "Cave Knight",
		description: "Tekad keras yang menambah daya tahan.",
		bonuses: {
			attack: 1,
			defense: 3,
		},
	},
	predator_instinct: {
		name: "Predator Instinct",
		type: "unique",
		source: "Awakening",
		description: "Unique skill untuk memburu dan menyerap lawan.",
		bonuses: {
			attack: 5,
			agility: 2,
		},
		requires: {
			level: 4,
			gold: 280,
			skills: ["acid_touch", "hunt_sense"],
		},
	},
	fortress_body: {
		name: "Fortress Body",
		type: "unique",
		source: "Awakening",
		description: "Unique skill untuk build tank.",
		bonuses: {
			maxHp: 24,
			defense: 6,
		},
		requires: {
			level: 8,
			gold: 520,
			skills: ["stone_skin", "iron_will"],
		},
	},
	phantom_hunter: {
		name: "Phantom Hunter",
		type: "unique",
		source: "Awakening",
		description: "Unique skill untuk serangan cepat dan berburu.",
		bonuses: {
			attack: 4,
			agility: 6,
		},
		requires: {
			level: 8,
			gold: 520,
			skills: ["shadow_step", "hunt_sense"],
		},
	},
	mana_core: {
		name: "Mana Core",
		type: "unique",
		source: "Awakening",
		description: "Unique skill untuk stabilitas mana dan serangan.",
		bonuses: {
			maxHp: 12,
			attack: 6,
			defense: 2,
		},
		requires: {
			level: 10,
			gold: 720,
			skills: ["crystal_focus", "bark_skin"],
		},
	},
};

const SKILL_ALIASES = {
	acid: "acid_touch",
	asam: "acid_touch",
	goblin: "goblin_trick",
	trick: "goblin_trick",
	wolf: "hunt_sense",
	hunt: "hunt_sense",
	bark: "bark_skin",
	treant: "bark_skin",
	shadow: "shadow_step",
	stone: "stone_skin",
	golem: "stone_skin",
	crystal: "crystal_focus",
	iron: "iron_will",
	predator: "predator_instinct",
	fortress: "fortress_body",
	phantom: "phantom_hunter",
	mana: "mana_core",
};

function isRecord(value) {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

function toInt(value, fallback = 0) {
	const number = Number(value);

	if (!Number.isFinite(number)) {
		return fallback;
	}

	return Math.trunc(number);
}

function roll(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(items) {
	return items[roll(0, items.length - 1)];
}

function cleanName(name) {
	const fallback = "Adventurer";
	const value = String(name || fallback)
		.replace(/\s+/g, " ")
		.trim();

	if (!value) {
		return fallback;
	}

	return value.slice(0, 32);
}

function normalizeInput(input) {
	return String(input || "")
		.toLowerCase()
		.trim()
		.replace(/[\s-]+/g, "_");
}

function getPayloads(user) {
	return isRecord(user?.payloads) ? user.payloads : {};
}

function formatNumber(value) {
	return new Intl.NumberFormat("id-ID").format(value);
}

const CHAT_DIVIDER = "━━━━━━━━━━━━━━━━━━━━";
const SUB_DIVIDER = "────────────";

const CLASS_ICONS = {
	warrior: "⚔️",
	rogue: "🗡️",
	mage: "🔮",
	ranger: "🏹",
};

const STAT_ICONS = {
	maxHp: "❤️",
	attack: "⚔️",
	defense: "🛡️",
	agility: "💨",
};

function chatHeader(icon, title, subtitle = "") {
	return [
		`${icon} *${title}*`,
		subtitle ? `_${subtitle}_` : "",
		CHAT_DIVIDER,
	].filter(Boolean);
}

function sectionTitle(icon, title) {
	return ["", `${icon} *${title}*`];
}

function commandHint(label, command) {
	return `↳ ${label}: \`${command}\``;
}

function itemBullet(text, icon = "•") {
	return `${icon} ${text}`;
}

function formatStatName(key) {
	const names = {
		maxHp: "HP",
		attack: "ATK",
		defense: "DEF",
		agility: "AGI",
	};

	return names[key] || key.toUpperCase();
}

function getStatIcon(key) {
	return STAT_ICONS[key] || "•";
}

function addItem(player, itemKey, amount = 1) {
	player.items[itemKey] = toInt(player.items[itemKey], 0) + amount;

	if (player.items[itemKey] <= 0) {
		delete player.items[itemKey];
	}
}

function xpToNext(level) {
	return 90 + level * 45 + Math.floor(level ** 1.45 * 18);
}

function getZone(level) {
	return (
		[...ZONES].reverse().find((zone) => level >= zone.minLevel) || ZONES[0]
	);
}

function getZoneKey(zone) {
	return normalizeInput(zone?.key || zone?.name);
}

function getDefaultZoneKey(level = 1) {
	return getZoneKey(getZone(level));
}

function normalizeZoneKey(input) {
	const key = normalizeInput(input);

	if (!key) {
		return null;
	}

	const byNumber = Number(key);

	if (
		Number.isInteger(byNumber) &&
		byNumber >= 1 &&
		byNumber <= ZONES.length
	) {
		return getZoneKey(ZONES[byNumber - 1]);
	}

	const match = ZONES.find((zone) => {
		const zoneKey = getZoneKey(zone);
		const normalizedName = normalizeInput(zone.name);
		const aliases = Array.isArray(zone.aliases) ? zone.aliases : [];

		return (
			zoneKey === key ||
			normalizedName === key ||
			normalizedName.includes(key) ||
			aliases.some((alias) => normalizeInput(alias) === key)
		);
	});

	return match ? getZoneKey(match) : null;
}

function getZoneByKey(zoneKey) {
	return ZONES.find((zone) => getZoneKey(zone) === zoneKey) || null;
}

function getActiveZone(player) {
	const level = toInt(player?.level, 1);
	const zoneKey = normalizeZoneKey(player?.zone) || getDefaultZoneKey(level);
	const zone = getZoneByKey(zoneKey);

	if (!zone || level < zone.minLevel) {
		return getZone(level);
	}

	return zone;
}

function buildMonster(player) {
	const playerLevel = toInt(player?.level ?? player, 1);
	const zone = isRecord(player)
		? getActiveZone(player)
		: getZone(playerLevel);
	const base = pick(zone.monsters);
	const scale = Math.max(0, playerLevel - zone.minLevel);

	return {
		...base,
		zone: zone.name,
		level: Math.max(1, playerLevel + roll(-1, 1)),
		hp: base.hp + scale * 13 + roll(0, 12),
		attack: base.attack + scale * 3 + roll(0, 3),
		defense: base.defense + scale * 2,
		agility: base.agility + scale,
	};
}

function normalizeClassKey(input) {
	const key = normalizeInput(input);

	if (STARTER_CLASSES[key]) {
		return key;
	}

	return CLASS_ALIASES[key] || null;
}

function normalizeItemKey(input) {
	const key = normalizeInput(input);

	if (SHOP_ITEMS[key] || MATERIALS[key] || CRAFTING_RECIPES[key]) {
		return key;
	}

	return ITEM_ALIASES[key] || null;
}

function normalizeRaceKey(input) {
	const key = normalizeInput(input);

	if (RACES[key]) {
		return key;
	}

	const match = Object.entries(RACES).find(
		([raceKey, race]) =>
			normalizeInput(race.name) === key || raceKey === key
	);

	return match?.[0] || null;
}

function normalizeSkillKey(input) {
	const key = normalizeInput(input);

	if (SKILLS[key]) {
		return key;
	}

	const match = Object.entries(SKILLS).find(
		([skillKey, skill]) =>
			normalizeInput(skill.name) === key || skillKey === key
	);

	return match?.[0] || SKILL_ALIASES[key] || null;
}

function getItemName(itemKey) {
	return (
		SHOP_ITEMS[itemKey]?.name ||
		MATERIALS[itemKey]?.name ||
		CRAFTING_RECIPES[itemKey]?.name ||
		itemKey
	);
}

function getSellPrice(itemKey) {
	if (MATERIALS[itemKey]) {
		return MATERIALS[itemKey].sellPrice;
	}

	const item = SHOP_ITEMS[itemKey];

	if (item?.type === "consumable" && item.price) {
		return Math.max(1, Math.floor(item.price * 0.45));
	}

	return null;
}

function getRace(player) {
	return RACES[normalizeRaceKey(player?.race)] || RACES.slime;
}

function getRaceKey(player) {
	return normalizeRaceKey(player?.race) || "slime";
}

function getRaceName(player) {
	return getRace(player).name;
}

function getSkillSlotLimit(player) {
	const level = toInt(player?.level, 1);

	return clamp(2 + Math.floor(level / 8), 2, 4);
}

function normalizeSkills(skills, level = 1) {
	const owned = {};

	for (const [rawKey, rawValue] of Object.entries(
		isRecord(skills?.owned) ? skills.owned : {}
	)) {
		const key = normalizeSkillKey(rawKey);

		if (!key || !SKILLS[key]) {
			continue;
		}

		const value = isRecord(rawValue) ? rawValue : {};
		owned[key] = {
			level: clamp(toInt(value.level, 1), 1, 5),
			shards: Math.max(0, toInt(value.shards, 0)),
			source: value.source || SKILLS[key].source || "",
			acquiredAt: Math.max(0, toInt(value.acquiredAt, Date.now())),
		};
	}

	const slots = getSkillSlotLimit({ level });
	const equipped = [];

	for (const rawKey of Array.isArray(skills?.equipped)
		? skills.equipped
		: []) {
		const key = normalizeSkillKey(rawKey);

		if (!key || !owned[key] || equipped.includes(key)) {
			continue;
		}

		equipped.push(key);

		if (equipped.length >= slots) {
			break;
		}
	}

	return {
		owned,
		equipped,
	};
}

function getOwnedSkillKeys(player) {
	return Object.keys(player?.skills?.owned || {}).filter(
		(key) => SKILLS[key]
	);
}

function getSkillName(skillKey) {
	return SKILLS[skillKey]?.name || skillKey;
}

function getSkillLevel(player, skillKey) {
	return clamp(toInt(player?.skills?.owned?.[skillKey]?.level, 1), 1, 5);
}

function playerHasSkill(player, skillKey) {
	return Boolean(player?.skills?.owned?.[skillKey]);
}

function formatSkillBonus(skillKey, level = 1) {
	const skill = SKILLS[skillKey];

	if (!skill?.bonuses) {
		return "-";
	}

	return Object.entries(skill.bonuses)
		.map(([key, value]) => `${formatStatName(key)} +${value * level}`)
		.join(", ");
}

function getRequirementIssues(player, requirements = {}) {
	const missing = [];

	if (requirements.level && player.level < requirements.level) {
		missing.push(`Lv ${player.level}/${requirements.level}`);
	}

	if (requirements.wins && player.wins < requirements.wins) {
		missing.push(`Win ${player.wins}/${requirements.wins}`);
	}

	if (requirements.gold && player.gold < requirements.gold) {
		missing.push(
			`Gold ${formatNumber(player.gold)}/${formatNumber(requirements.gold)}`
		);
	}

	for (const [itemKey, amount] of Object.entries(requirements.items || {})) {
		const owned = toInt(player.items?.[itemKey], 0);

		if (owned < amount) {
			missing.push(`${getItemName(itemKey)} ${owned}/${amount}`);
		}
	}

	for (const skillKey of requirements.skills || []) {
		if (!playerHasSkill(player, skillKey)) {
			missing.push(getSkillName(skillKey));
		}
	}

	return missing;
}

function consumeRequirements(player, requirements = {}) {
	if (requirements.gold) {
		player.gold -= requirements.gold;
	}

	for (const [itemKey, amount] of Object.entries(requirements.items || {})) {
		addItem(player, itemKey, -amount);
	}
}

function formatRequirements(requirements = {}) {
	return Object.entries(requirements)
		.map(([key, amount]) => `${getItemName(key)} x${amount}`)
		.join(", ");
}

function normalizeJobKey(input) {
	const key = normalizeInput(input);

	if (!key) {
		return pick(Object.keys(JOBS));
	}

	for (const [jobKey, job] of Object.entries(JOBS)) {
		if (jobKey === key || job.aliases.includes(key)) {
			return jobKey;
		}
	}

	return null;
}

function normalizeStats(classKey, stats) {
	const starter = STARTER_CLASSES[classKey] || STARTER_CLASSES.warrior;

	return {
		maxHp: toInt(stats?.maxHp, starter.stats.maxHp),
		attack: toInt(stats?.attack, starter.stats.attack),
		defense: toInt(stats?.defense, starter.stats.defense),
		agility: toInt(stats?.agility, starter.stats.agility),
	};
}

function getStats(player) {
	const stats = {
		...normalizeStats(player.class, player.stats),
	};
	const race = getRace(player);

	for (const [key, value] of Object.entries(race.bonuses || {})) {
		stats[key] = toInt(stats[key], 0) + value;
	}

	for (const itemKey of Object.values(player.gear || {})) {
		const item = SHOP_ITEMS[itemKey];

		if (!item?.bonuses) {
			continue;
		}

		for (const [key, value] of Object.entries(item.bonuses)) {
			stats[key] = toInt(stats[key], 0) + value;
		}
	}

	for (const skillKey of player.skills?.equipped || []) {
		const skill = SKILLS[skillKey];

		if (!skill?.bonuses || !player.skills?.owned?.[skillKey]) {
			continue;
		}

		const level = getSkillLevel(player, skillKey);

		for (const [key, value] of Object.entries(skill.bonuses)) {
			stats[key] = toInt(stats[key], 0) + value * level;
		}
	}

	return stats;
}

function formatItemMap(items = {}) {
	return Object.fromEntries(
		Object.entries(items)
			.filter(([, amount]) => toInt(amount, 0) > 0)
			.map(([key, amount]) => [getItemName(key), toInt(amount, 0)])
	);
}

function createDashboardSnapshot(player) {
	const normalized = normalizePlayer(player);
	const stats = getStats(normalized);
	const zone = getActiveZone(normalized);

	return {
		characterName: normalized.name,
		classKey: normalized.class,
		className: STARTER_CLASSES[normalized.class]?.name || "Warrior",
		raceKey: getRaceKey(normalized),
		raceName: getRaceName(normalized),
		raceRank: getRace(normalized).rank,
		raceTitle: getRace(normalized).title,
		equippedSkills: normalized.skills.equipped.map((skillKey) => ({
			key: skillKey,
			name: getSkillName(skillKey),
			level: getSkillLevel(normalized, skillKey),
			type: SKILLS[skillKey]?.type || "normal",
		})),
		ownedSkillCount: getOwnedSkillKeys(normalized).length,
		level: normalized.level,
		xp: normalized.xp,
		xpNext: xpToNext(normalized.level),
		gold: normalized.gold,
		hp: normalized.hp,
		maxHp: stats.maxHp,
		energy: normalized.energy,
		maxEnergy: normalized.maxEnergy,
		attack: stats.attack,
		defense: stats.defense,
		agility: stats.agility,
		wins: normalized.wins,
		losses: normalized.losses,
		jobs: normalized.jobs,
		zoneName: zone.name,
		gear: {
			weapon: getGearName(normalized.gear.weapon),
			armor: getGearName(normalized.gear.armor),
			charm: getGearName(normalized.gear.charm),
		},
		items: formatItemMap(normalized.items),
		rawPlayer: normalized,
		updatedAt: normalized.updatedAt,
	};
}

function attachPremium(player, premiumResult) {
	if (premiumResult?.status !== "ok") {
		return player;
	}

	return {
		...player,
		premium: createPremiumSnapshot(premiumResult),
	};
}

function attachGuild(player, guildResult) {
	if (guildResult?.status !== "ok") {
		return player;
	}

	return {
		...player,
		guild: {
			label: guildResult.label,
			memberships: Object.keys(guildResult.memberships || {}),
		},
	};
}

function attachSquad(player, squadResult) {
	if (squadResult?.status !== "ok") {
		return player;
	}

	return {
		...player,
		squad: {
			name: squadResult.squad?.name || "",
			code: squadResult.squad?.code || "",
			memberCount: squadResult.members?.length || 0,
			maxMembers: squadResult.squad?.max_members || 4,
		},
	};
}

function normalizePlayer(player, fallbackName = "Adventurer") {
	const classKey = normalizeClassKey(player?.class) || "warrior";
	const starter = STARTER_CLASSES[classKey];
	const stats = normalizeStats(classKey, player?.stats);
	const level = Math.max(1, toInt(player?.level, 1));
	const zoneKey = normalizeZoneKey(player?.zone) || getDefaultZoneKey(level);
	const gear = {
		weapon: player?.gear?.weapon || starter.weapon,
		armor: player?.gear?.armor || null,
		charm: player?.gear?.charm || null,
	};
	const normalized = {
		version: RPG_VERSION,
		name: cleanName(player?.name || fallbackName),
		class: classKey,
		race: normalizeRaceKey(player?.race) || "slime",
		zone: zoneKey,
		level,
		xp: Math.max(0, toInt(player?.xp, 0)),
		gold: Math.max(0, toInt(player?.gold, 100)),
		hp: Math.max(0, toInt(player?.hp, stats.maxHp)),
		energy: Math.max(0, toInt(player?.energy, 100)),
		maxEnergy: Math.max(50, toInt(player?.maxEnergy, 100)),
		stats,
		items: {
			...(isRecord(player?.items) ? player.items : {}),
		},
		gear,
		skills: normalizeSkills(player?.skills, level),
		wins: Math.max(0, toInt(player?.wins, 0)),
		losses: Math.max(0, toInt(player?.losses, 0)),
		jobs: Math.max(0, toInt(player?.jobs, 0)),
		lastDaily: Math.max(0, toInt(player?.lastDaily, 0)),
		lastRegen: Math.max(0, toInt(player?.lastRegen, Date.now())),
		createdAt: Math.max(0, toInt(player?.createdAt, Date.now())),
		updatedAt: Math.max(0, toInt(player?.updatedAt, Date.now())),
	};
	const derivedStats = getStats(normalized);
	const activeZone = getActiveZone(normalized);

	normalized.zone = getZoneKey(activeZone);
	normalized.hp =
		player?.hp === undefined || player?.hp === null
			? derivedStats.maxHp
			: clamp(normalized.hp, 0, derivedStats.maxHp);
	normalized.energy = clamp(normalized.energy, 0, normalized.maxEnergy);

	return normalized;
}

function createPlayer(name, classKey) {
	const starter = STARTER_CLASSES[classKey];
	const now = Date.now();

	return {
		version: RPG_VERSION,
		name: cleanName(name),
		class: classKey,
		race: "slime",
		zone: getZoneKey(ZONES[0]),
		level: 1,
		xp: 0,
		gold: 100,
		hp: starter.stats.maxHp,
		energy: 100,
		maxEnergy: 100,
		stats: {
			...starter.stats,
		},
		items: {
			potion: 2,
		},
		gear: {
			weapon: starter.weapon,
			armor: null,
			charm: null,
		},
		skills: {
			owned: {},
			equipped: [],
		},
		wins: 0,
		losses: 0,
		jobs: 0,
		lastDaily: 0,
		lastRegen: now,
		createdAt: now,
		updatedAt: now,
	};
}

function applyRegen(player, now = Date.now()) {
	const next = normalizePlayer(player);
	const elapsed = Math.max(0, now - next.lastRegen);
	const energyGain = Math.floor(elapsed / ENERGY_REGEN_MS);
	const hpGain = Math.floor(elapsed / HP_REGEN_MS) * 2;
	const stats = getStats(next);
	let changed = false;

	if (energyGain > 0 && next.energy < next.maxEnergy) {
		next.energy = clamp(next.energy + energyGain, 0, next.maxEnergy);
		changed = true;
	}

	if (hpGain > 0 && next.hp < stats.maxHp) {
		next.hp = clamp(next.hp + hpGain, 0, stats.maxHp);
		changed = true;
	}

	if (energyGain > 0 || hpGain > 0) {
		next.lastRegen = now;
	}

	return {
		player: next,
		changed,
	};
}

function addXp(player, amount) {
	const levels = [];
	player.xp += Math.max(0, amount);

	while (player.xp >= xpToNext(player.level)) {
		player.xp -= xpToNext(player.level);
		player.level += 1;

		const growth =
			STARTER_CLASSES[player.class]?.growth ||
			STARTER_CLASSES.warrior.growth;
		player.stats.maxHp += growth.maxHp;
		player.stats.attack += growth.attack;
		player.stats.defense += growth.defense;
		player.stats.agility += growth.agility;

		if (player.level % 2 === 0) {
			player.maxEnergy += 5;
		}

		const stats = getStats(player);
		player.hp = stats.maxHp;
		player.energy = player.maxEnergy;
		levels.push(player.level);
	}

	return levels;
}

function learnSkill(player, skillKey, source = "") {
	if (!SKILLS[skillKey]) {
		return null;
	}

	if (!player.skills) {
		player.skills = normalizeSkills({}, player.level);
	}

	const existing = player.skills.owned[skillKey];

	if (!existing) {
		player.skills.owned[skillKey] = {
			level: 1,
			shards: 0,
			source: source || SKILLS[skillKey].source || "",
			acquiredAt: Date.now(),
		};

		if (player.skills.equipped.length < getSkillSlotLimit(player)) {
			player.skills.equipped.push(skillKey);
		}

		return {
			status: "new",
			key: skillKey,
			skill: SKILLS[skillKey],
			level: 1,
			equipped: player.skills.equipped.includes(skillKey),
		};
	}

	const needed = existing.level + 1;
	existing.shards += 1;

	if (existing.level < 5 && existing.shards >= needed) {
		existing.shards -= needed;
		existing.level += 1;

		return {
			status: "level_up",
			key: skillKey,
			skill: SKILLS[skillKey],
			level: existing.level,
			shards: existing.shards,
		};
	}

	return {
		status: "shard",
		key: skillKey,
		skill: SKILLS[skillKey],
		level: existing.level,
		shards: existing.shards,
		needed,
	};
}

function tryAbsorbSkill(player, monster) {
	if (!monster.skill || !SKILLS[monster.skill]) {
		return null;
	}

	const race = getRace(player);
	const rankBoost = Math.max(0, "FEDCBA".indexOf(race.rank));
	const chance = clamp(
		(monster.absorbChance || 0.14) +
			player.level * 0.003 +
			rankBoost * 0.015,
		0.08,
		0.34
	);

	if (Math.random() > chance) {
		return {
			status: "miss",
			key: monster.skill,
			skill: SKILLS[monster.skill],
			chance,
		};
	}

	return {
		...learnSkill(player, monster.skill, monster.name),
		chance,
	};
}

function simulateBattle(player, monster) {
	const playerStats = getStats(player);
	let playerHp = player.hp;
	let monsterHp = monster.hp;
	let totalDamageTaken = 0;
	let totalDamageGiven = 0;

	for (let round = 1; round <= 8; round += 1) {
		const playerDamage = Math.max(
			1,
			playerStats.attack +
				roll(4, 12) -
				Math.floor(monster.defense * 0.55)
		);
		monsterHp -= playerDamage;
		totalDamageGiven += playerDamage;

		if (monsterHp <= 0) {
			return {
				won: true,
				playerHp: clamp(playerHp, 0, playerStats.maxHp),
				damageTaken: totalDamageTaken,
				damageGiven: totalDamageGiven,
				rounds: round,
			};
		}

		const dodgeChance = clamp(
			playerStats.agility / (playerStats.agility + monster.agility + 35),
			0.04,
			0.38
		);
		const dodged = Math.random() < dodgeChance;
		const monsterDamage = dodged
			? 0
			: Math.max(
					1,
					monster.attack +
						roll(3, 10) -
						Math.floor(playerStats.defense * 0.65)
				);

		playerHp -= monsterDamage;
		totalDamageTaken += monsterDamage;

		if (playerHp <= 0) {
			return {
				won: false,
				playerHp: 1,
				damageTaken: totalDamageTaken,
				damageGiven: totalDamageGiven,
				rounds: round,
			};
		}
	}

	return {
		won: monsterHp <= 0,
		playerHp: clamp(playerHp, 1, playerStats.maxHp),
		damageTaken: totalDamageTaken,
		damageGiven: totalDamageGiven,
		rounds: 8,
	};
}

function getGearName(itemKey) {
	return SHOP_ITEMS[itemKey]?.name || "-";
}

function progressBar(current, max, width = 12) {
	const safeMax = Math.max(1, max);
	const filled = clamp(Math.round((current / safeMax) * width), 0, width);

	return `${"▰".repeat(filled)}${"▱".repeat(width - filled)}`;
}

function formatDuration(ms) {
	const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;

	if (hours > 0) {
		return `${hours}j ${minutes}m`;
	}

	return `${minutes}m`;
}

async function loadLegacyLocalPlayer(userId, name) {
	const user = await db.UserModel.getUser(userId);
	const playerData = getPayloads(user).rpg;

	if (!playerData) {
		return {
			user,
			player: null,
			regened: false,
		};
	}

	return {
		user,
		player: normalizePlayer(playerData, user?.name || name),
	};
}

async function loadPlayer(userId, name) {
	const cloud = await getRpgPlayerByWhatsApp(userId);

	if (cloud.status === "ok") {
		const regen = applyRegen(normalizePlayer(cloud.player, name));

		return {
			user: {
				name: cloud.profile?.display_name || name,
			},
			player: regen.player,
			regened: regen.changed,
		};
	}

	if (cloud.status === "missing" || cloud.status === "empty") {
		const legacy = await loadLegacyLocalPlayer(userId, name);

		if (!legacy.player) {
			return {
				user: legacy.user,
				player: null,
				regened: false,
			};
		}

		await syncRpgProfileSnapshot(
			userId,
			createDashboardSnapshot(legacy.player)
		);

		return {
			user: legacy.user,
			player: legacy.player,
			regened: false,
		};
	}

	return {
		user: {
			name,
		},
		player: null,
		regened: false,
		error: cloud.error,
		status: cloud.status,
	};
}

async function writePlayer(userId, user, player, name) {
	const next = {
		...normalizePlayer(player, name || user?.name),
		updatedAt: Date.now(),
	};

	await syncRpgProfileSnapshot(userId, createDashboardSnapshot(next));

	return next;
}

async function savePlayer(userId, user, player, name) {
	return writePlayer(userId, user, player, name);
}

async function forceSavePlayer(userId, player, name) {
	const next = {
		...normalizePlayer(player, name),
		updatedAt: Date.now(),
	};

	await syncRpgProfileSnapshot(userId, createDashboardSnapshot(next));

	return next;
}

export async function syncCurrentPlayerToSupabase(userId, name) {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	if (loaded.regened) {
		await savePlayer(userId, loaded.user, loaded.player, name);
		return {
			status: "ok",
			player: loaded.player,
		};
	}

	const sync = await syncRpgProfileSnapshot(
		userId,
		createDashboardSnapshot(loaded.player)
	);

	return {
		...sync,
		player: loaded.player,
	};
}

export async function clearLocalRpgPlayer(userId) {
	const user = await db.UserModel.getUser(userId);
	const payloads = { ...getPayloads(user) };

	if (!payloads.rpg) {
		return {
			status: "missing",
		};
	}

	delete payloads.rpg;
	await db.UserModel.setUser(userId, {
		...user,
		payloads,
	});

	return {
		status: "ok",
	};
}

export async function restoreCloudPlayerToWhatsApp(userId, name) {
	const restore = await getLatestCompletedRestoreSession(userId);

	if (restore.status !== "ok") {
		return restore;
	}

	const cloud = await getCloudRpgProfileByUserId(
		restore.session.completed_user_id
	);

	if (cloud.status !== "ok") {
		return {
			status:
				cloud.status === "missing" || cloud.status === "empty"
					? "no_cloud_save"
					: cloud.status,
			error: cloud.error,
		};
	}

	const player = await forceSavePlayer(userId, cloud.player, name);
	const bind = await bindWhatsAppToUser(
		restore.session.completed_user_id,
		userId,
		restore.session.display_name || name
	);

	if (bind.status !== "ok") {
		return bind;
	}

	await syncRpgProfileSnapshot(userId, createDashboardSnapshot(player));
	await markRestoreSessionRestored(restore.session.token_hash);

	return {
		status: "ok",
		player,
		cloud: cloud.profile,
	};
}

export function getPlayerId(m) {
	return m?.senderPn || m?.sender || m?.senderLid || "";
}

export function formatClassList(prefix = ".") {
	const rows = Object.entries(STARTER_CLASSES).flatMap(([key, value]) => [
		`${CLASS_ICONS[key] || "🎒"} *${key}* - ${value.name}`,
		`   ❤️ ${value.stats.maxHp}  ⚔️ ${value.stats.attack}  🛡️ ${value.stats.defense}  💨 ${value.stats.agility}`,
		`   _${value.description}_`,
	]);

	return [
		...chatHeader("🌌", BRAND_CONFIG.name, "Pilih class awalmu"),
		"",
		...rows,
		"",
		commandHint("Mulai", `${prefix}mulai warrior`),
	].join("\n");
}

export function formatShop(prefix = ".") {
	const rows = Object.entries(SHOP_ITEMS)
		.filter(([, item]) => !item.hidden)
		.flatMap(([key, item]) => {
			const levelText = item.level ? ` Lv ${item.level}` : "";
			return [
				`🛒 *${key}* - ${item.name}${levelText}`,
				`   💰 ${formatNumber(item.price)} gold | ${item.description}`,
			];
		});

	return [
		...chatHeader("🛍️", `Toko ${BRAND_CONFIG.name}`, "Gear dan consumable"),
		...rows,
		"",
		commandHint("Beli item", `${prefix}beli potion 2`),
	].join("\n");
}

export function formatCraftList(prefix = ".") {
	const rows = Object.entries(CRAFTING_RECIPES).flatMap(([key, recipe]) => {
		const levelText = recipe.level ? ` | Butuh Lv ${recipe.level}` : "";
		const cost = recipe.gold ? `, ${formatNumber(recipe.gold)} gold` : "";

		return [
			`🧰 *${key}* - ${recipe.name}`,
			`   Output: ${recipe.description}${levelText}`,
			`   Bahan: ${formatRequirements(recipe.requires)}${cost}`,
		];
	});

	return [
		...chatHeader(
			"⚒️",
			`Craft ${BRAND_CONFIG.name}`,
			"Buat item dari material"
		),
		...rows,
		"",
		commandHint("List crafting", `${prefix}craft list`),
		commandHint("Craft item", `${prefix}craft potion`),
	].join("\n");
}

export function formatWorldMap(player = null, prefix = ".") {
	const level = player?.level || 1;
	const activeZone = player ? getActiveZone(player) : null;
	const rows = ZONES.map((zone) => {
		const unlocked = level >= zone.minLevel;
		const status = unlocked ? "Terbuka" : `Butuh Lv ${zone.minLevel}`;
		const selected =
			activeZone && getZoneKey(activeZone) === getZoneKey(zone);
		const monsters = zone.monsters
			.map((monster) => monster.name)
			.join(", ");

		return [
			`${selected ? "✅" : unlocked ? "🔓" : "🔒"} *${getZoneKey(zone)}* - ${zone.name}`,
			`   ${status}${selected ? " | Aktif" : ""}`,
			`   Monster: ${monsters}`,
		].join("\n");
	});

	return [
		...chatHeader(
			"🗺️",
			`Map ${BRAND_CONFIG.name}`,
			`Level aktif: ${level}`
		),
		...rows,
		"",
		commandHint("Ganti map", `${prefix}map <kode/nomor>`),
		`Contoh: \`${prefix}map hutan_lumina\` atau \`${prefix}map 2\``,
	].join("\n");
}

export function formatInventory(player) {
	const items = Object.entries(player.items || {})
		.filter(([, amount]) => amount > 0)
		.map(([key, amount]) =>
			itemBullet(`${getItemName(key)} x${amount}`, "📦")
		);

	if (!items.length) {
		items.push(itemBullet("Kosong", "📦"));
	}

	return [
		...chatHeader(
			"🎒",
			`Inventory ${player.name}`,
			`Gold ${formatNumber(player.gold)}`
		),
		...sectionTitle("📦", "Item"),
		...items,
		...sectionTitle("🧰", "Gear"),
		`⚔️ Weapon: *${getGearName(player.gear.weapon)}*`,
		`🛡️ Armor: *${getGearName(player.gear.armor)}*`,
		`🔮 Charm: *${getGearName(player.gear.charm)}*`,
		...sectionTitle("🎮", "Aksi"),
		itemBullet("craft - buat item dari material", "•"),
		itemBullet("jual - tukar material/item jadi gold", "•"),
	].join("\n");
}

function formatRequirementList(requirements = {}) {
	const rows = [];

	if (requirements.level) {
		rows.push(`Lv ${requirements.level}`);
	}

	if (requirements.wins) {
		rows.push(`Win ${requirements.wins}`);
	}

	if (requirements.gold) {
		rows.push(`${formatNumber(requirements.gold)} gold`);
	}

	for (const [itemKey, amount] of Object.entries(requirements.items || {})) {
		rows.push(`${getItemName(itemKey)} x${amount}`);
	}

	for (const skillKey of requirements.skills || []) {
		rows.push(getSkillName(skillKey));
	}

	return rows.join(", ") || "-";
}

export function formatRaceStatus(player, prefix = ".") {
	const race = getRace(player);
	const bonusRows = Object.entries(race.bonuses || {}).map(
		([key, value]) => `${getStatIcon(key)} ${formatStatName(key)} +${value}`
	);
	const nextRows = race.next.length
		? race.next.map((raceKey) => {
				const next = RACES[raceKey];
				const missing = getRequirementIssues(player, next.requires);
				const icon = missing.length ? "🔒" : "✅";
				const status = missing.length
					? `Kurang: ${missing.join(", ")}`
					: "Siap evolve";

				return [
					`${icon} *${raceKey}* - ${next.name} Rank ${next.rank}`,
					`   ${status}`,
				].join("\n");
			})
		: [itemBullet("Evolusi berikutnya belum terbuka.", "🔒")];

	return [
		...chatHeader(
			"🧬",
			`Race ${player.name}`,
			`${race.name} Rank ${race.rank}`
		),
		`🏷️ Title: *${race.title}*`,
		`_${race.description}_`,
		...sectionTitle("✨", "Bonus Ras"),
		...(bonusRows.length ? bonusRows : ["-"]),
		...sectionTitle("🧭", "Jalur Evolusi"),
		...nextRows,
		"",
		commandHint("Evolve", `${prefix}evolve <race>`),
	].join("\n");
}

export function formatEvolutionResult(result, prefix = ".") {
	return [
		...chatHeader(
			"🧬",
			"Evolusi Berhasil",
			`${result.from.name} -> ${result.to.name}`
		),
		`⭐ Rank: *${result.to.rank}*`,
		`🏷️ Title: *${result.to.title}*`,
		"",
		formatProfile(result.player, prefix),
	].join("\n");
}

export function formatSkillStatus(player, prefix = ".") {
	const slots = getSkillSlotLimit(player);
	const ownedKeys = getOwnedSkillKeys(player);
	const equippedRows = player.skills.equipped.length
		? player.skills.equipped.map((skillKey) => {
				const level = getSkillLevel(player, skillKey);
				const skill = SKILLS[skillKey];
				const icon = skill.type === "unique" ? "🌟" : "✨";

				return [
					`${icon} *${getSkillName(skillKey)}* Lv ${level}`,
					`   ${formatSkillBonus(skillKey, level)}`,
				].join("\n");
			})
		: [itemBullet("Belum ada skill aktif.", "▫️")];
	const ownedRows = ownedKeys.length
		? ownedKeys.map((skillKey) => {
				const data = player.skills.owned[skillKey];
				const skill = SKILLS[skillKey];
				const type = skill.type === "unique" ? "Unique" : "Normal";
				const icon = skill.type === "unique" ? "🌟" : "🔹";

				return [
					`${icon} *${skillKey}* - ${skill.name} Lv ${data.level}`,
					`   ${type} | shard ${data.shards}`,
				].join("\n");
			})
		: [
				itemBullet(
					`Belum ada skill. Menangkan ${prefix}jelajah untuk menyerap skill.`,
					"▫️"
				),
			];
	const uniqueRows = Object.entries(SKILLS)
		.filter(([, skill]) => skill.type === "unique")
		.map(([skillKey, skill]) => {
			const owned = playerHasSkill(player, skillKey);
			const icon = owned ? "✅" : "🔒";

			return [
				`${icon} *${skillKey}* - ${skill.name}`,
				`   ${owned ? "Dimiliki" : `Syarat: ${formatRequirementList(skill.requires)}`}`,
			].join("\n");
		});

	return [
		...chatHeader(
			"✨",
			`Skill ${player.name}`,
			`Slot aktif ${player.skills.equipped.length}/${slots}`
		),
		...sectionTitle("⚡", "Aktif"),
		...equippedRows,
		...sectionTitle("📚", "Dimiliki"),
		...ownedRows,
		...sectionTitle("🌟", "Unique Skill"),
		...uniqueRows,
		"",
		commandHint("Equip", `${prefix}skill equip <skill>`),
		commandHint("Awaken", `${prefix}skill awaken <unique>`),
	].join("\n");
}

export function formatProfile(player, prefix = ".") {
	const skills = normalizeSkills(player.skills, player.level);
	const displayPlayer = {
		...player,
		skills,
	};
	const stats = getStats(displayPlayer);
	const nextXp = xpToNext(player.level);
	const className = STARTER_CLASSES[player.class]?.name || "Warrior";
	const race = getRace(player);
	const zone = getActiveZone(player);
	const classIcon = CLASS_ICONS[player.class] || "🎒";
	const premiumLabel = player.premium?.label || "Free";
	const guildLabel = player.guild?.label || "Belum daftar";
	const squadLabel = player.squad?.name
		? `${player.squad.name} (${player.squad.memberCount}/${player.squad.maxMembers})`
		: "Belum ada";
	const skillText = skills.equipped.length
		? skills.equipped
				.map(
					(skillKey) =>
						`${getSkillName(skillKey)} Lv ${getSkillLevel(displayPlayer, skillKey)}`
				)
				.join(", ")
		: "-";

	return [
		...chatHeader(
			"👤",
			player.name,
			`${classIcon} ${className} Lv ${player.level}`
		),
		`🧬 Race: *${race.name} Rank ${race.rank}*`,
		`🗺️ Map: *${zone.name}*`,
		`🏷️ Title: *${race.title}*`,
		`💎 Premium: *${premiumLabel}*`,
		`🏛️ Guild: *${guildLabel}*`,
		`👥 Squad: *${squadLabel}*`,
		`💰 Gold: *${formatNumber(player.gold)}*`,
		...sectionTitle("📊", "Resource"),
		`❤️ HP  ${progressBar(player.hp, stats.maxHp)} *${player.hp}/${stats.maxHp}*`,
		`⚡ EN  ${progressBar(player.energy, player.maxEnergy)} *${player.energy}/${player.maxEnergy}*`,
		`⭐ XP  ${progressBar(player.xp, nextXp)} *${player.xp}/${nextXp}*`,
		...sectionTitle("⚔️", "Battle"),
		`⚔️ ATK *${stats.attack}*  🛡️ DEF *${stats.defense}*  💨 AGI *${stats.agility}*`,
		`✨ Skill: *${skillText}*`,
		`🏆 Win *${player.wins}*  💀 Lose *${player.losses}*  🧰 Job *${player.jobs}*`,
		"",
		commandHint(
			"Aksi",
			`${prefix}jelajah | ${prefix}skill | ${prefix}race`
		),
	].join("\n");
}

export async function registerPlayer(userId, name, classInput) {
	const classKey = normalizeClassKey(classInput);

	if (!classKey) {
		return {
			status: "invalid_class",
		};
	}

	const loaded = await loadPlayer(userId, name);

	if (loaded.player) {
		return {
			status: "exists",
			player: loaded.player,
		};
	}

	const player = createPlayer(name, classKey);
	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
	};
}

export async function getPlayerProfile(userId, name) {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const player = loaded.regened
		? await savePlayer(userId, loaded.user, loaded.player, name)
		: loaded.player;

	if (!loaded.regened) {
		await syncRpgProfileSnapshot(userId, createDashboardSnapshot(player));
	}

	const [premium, guild, squad] = await Promise.all([
		getPremiumStatusByWhatsApp(userId),
		getGuildStatusByWhatsApp(userId),
		getSquadByWhatsApp(userId),
	]);
	const displayPlayer = attachSquad(
		attachGuild(attachPremium(player, premium), guild),
		squad
	);

	return {
		status: "ok",
		player: displayPlayer,
	};
}

export async function setPlayerZone(userId, name, zoneInput) {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const player = loaded.player;
	const zoneKey = normalizeZoneKey(zoneInput);
	const zone = zoneKey ? getZoneByKey(zoneKey) : null;

	if (!zone) {
		return {
			status: "invalid_zone",
			player,
		};
	}

	if (player.level < zone.minLevel) {
		return {
			status: "locked",
			player,
			zone,
			requiredLevel: zone.minLevel,
		};
	}

	player.zone = getZoneKey(zone);
	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		zone,
	};
}

export async function getRaceStatus(userId, name) {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const player = loaded.regened
		? await savePlayer(userId, loaded.user, loaded.player, name)
		: loaded.player;

	return {
		status: "ok",
		player,
		raceKey: getRaceKey(player),
		race: getRace(player),
	};
}

export async function evolveRace(userId, name, raceInput) {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const player = loaded.player;
	const current = getRace(player);
	const targetKey = normalizeRaceKey(raceInput);
	const target = targetKey ? RACES[targetKey] : null;

	if (!targetKey || !target) {
		return {
			status: "invalid_race",
			player,
			race: current,
		};
	}

	if (!current.next.includes(targetKey)) {
		return {
			status: "not_available",
			player,
			race: current,
			target,
		};
	}

	const missing = getRequirementIssues(player, target.requires);

	if (missing.length) {
		return {
			status: "requirements",
			player,
			race: current,
			target,
			missing,
		};
	}

	consumeRequirements(player, target.requires);
	player.race = targetKey;
	const stats = getStats(player);
	player.hp = stats.maxHp;
	player.energy = player.maxEnergy;

	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		from: current,
		to: target,
	};
}

export async function getSkillStatus(userId, name) {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const player = loaded.regened
		? await savePlayer(userId, loaded.user, loaded.player, name)
		: loaded.player;

	return {
		status: "ok",
		player,
	};
}

export async function equipSkill(userId, name, skillInput) {
	const skillKey = normalizeSkillKey(skillInput);
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const player = loaded.player;

	if (!skillKey || !SKILLS[skillKey]) {
		return {
			status: "invalid_skill",
			player,
		};
	}

	if (!playerHasSkill(player, skillKey)) {
		return {
			status: "not_owned",
			player,
			skill: SKILLS[skillKey],
		};
	}

	if (player.skills.equipped.includes(skillKey)) {
		return {
			status: "already_equipped",
			player,
			skill: SKILLS[skillKey],
		};
	}

	const slots = getSkillSlotLimit(player);

	if (player.skills.equipped.length >= slots) {
		return {
			status: "slots_full",
			player,
			slots,
		};
	}

	player.skills.equipped.push(skillKey);
	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		skill: SKILLS[skillKey],
	};
}

export async function unequipSkill(userId, name, skillInput) {
	const skillKey = normalizeSkillKey(skillInput);
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const player = loaded.player;

	if (!skillKey || !SKILLS[skillKey]) {
		return {
			status: "invalid_skill",
			player,
		};
	}

	if (!player.skills.equipped.includes(skillKey)) {
		return {
			status: "not_equipped",
			player,
			skill: SKILLS[skillKey],
		};
	}

	player.skills.equipped = player.skills.equipped.filter(
		(key) => key !== skillKey
	);
	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		skill: SKILLS[skillKey],
	};
}

export async function awakenSkill(userId, name, skillInput) {
	const skillKey = normalizeSkillKey(skillInput);
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const player = loaded.player;
	const skill = skillKey ? SKILLS[skillKey] : null;

	if (!skillKey || !skill || skill.type !== "unique") {
		return {
			status: "invalid_unique",
			player,
		};
	}

	if (playerHasSkill(player, skillKey)) {
		return {
			status: "already_owned",
			player,
			skill,
		};
	}

	const missing = getRequirementIssues(player, skill.requires);

	if (missing.length) {
		return {
			status: "requirements",
			player,
			skill,
			missing,
		};
	}

	consumeRequirements(player, skill.requires);
	const learned = learnSkill(player, skillKey, "Awakening");

	if (!player.skills.equipped.includes(skillKey)) {
		if (player.skills.equipped.length >= getSkillSlotLimit(player)) {
			player.skills.equipped.shift();
		}

		player.skills.equipped.push(skillKey);
	}

	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		skill,
		learned,
	};
}

export async function runAdventure(userId, name) {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const player = loaded.player;
	const stats = getStats(player);
	const energyCost = 12;

	if (player.hp <= 1) {
		if (loaded.regened) {
			await savePlayer(userId, loaded.user, player, name);
		}

		return {
			status: "low_hp",
			player,
		};
	}

	if (player.energy < energyCost) {
		if (loaded.regened) {
			await savePlayer(userId, loaded.user, player, name);
		}

		return {
			status: "no_energy",
			player,
			needed: energyCost,
		};
	}

	player.energy -= energyCost;

	const monster = buildMonster(player);
	const battle = simulateBattle(player, monster);
	const rewards = {
		gold: 0,
		xp: 0,
		items: [],
		levels: [],
		absorb: null,
	};

	player.hp = clamp(battle.playerHp, 1, stats.maxHp);

	if (battle.won) {
		rewards.gold = roll(42, 82) + player.level * 12 + monster.level * 6;
		rewards.xp = roll(35, 58) + monster.level * 10;
		player.gold += rewards.gold;
		player.wins += 1;

		if (Math.random() < 0.34) {
			const itemKey = Math.random() < 0.72 ? "herb" : "ore";
			addItem(player, itemKey, 1);
			rewards.items.push(itemKey);
		}

		rewards.levels = addXp(player, rewards.xp);
		rewards.absorb = tryAbsorbSkill(player, monster);
	} else {
		rewards.xp = Math.max(12, Math.floor((28 + monster.level * 6) / 2));
		player.losses += 1;
		rewards.levels = addXp(player, rewards.xp);
	}

	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		monster,
		battle,
		rewards,
		energyCost,
	};
}

export async function runJob(userId, name, jobInput) {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const jobKey = normalizeJobKey(jobInput);

	if (!jobKey) {
		return {
			status: "invalid_job",
		};
	}

	const player = loaded.player;
	const job = JOBS[jobKey];
	const energyCost = 8;

	if (player.energy < energyCost) {
		if (loaded.regened) {
			await savePlayer(userId, loaded.user, player, name);
		}

		return {
			status: "no_energy",
			player,
			needed: energyCost,
		};
	}

	player.energy -= energyCost;

	const gold = roll(job.gold[0], job.gold[1]) + player.level * 7;
	const xp = roll(job.xp[0], job.xp[1]) + player.level * 5;
	const itemAmount = Math.random() < 0.65 ? 1 : 2;
	player.gold += gold;
	player.jobs += 1;
	addItem(player, job.item, itemAmount);
	const levels = addXp(player, xp);
	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		job,
		rewards: {
			gold,
			xp,
			item: job.itemName,
			itemAmount,
			levels,
		},
		energyCost,
	};
}

export async function claimDaily(userId, name) {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const now = Date.now();
	const player = loaded.player;

	if (player.lastDaily && now - player.lastDaily < DAY_MS) {
		if (loaded.regened) {
			await savePlayer(userId, loaded.user, player, name);
		}

		return {
			status: "cooldown",
			remaining: DAY_MS - (now - player.lastDaily),
			player,
		};
	}

	const stats = getStats(player);
	const rewards = {
		gold: 150 + player.level * 25,
		xp: 48 + player.level * 9,
		potion: 1,
		levels: [],
	};

	player.gold += rewards.gold;
	player.energy = player.maxEnergy;
	player.hp = stats.maxHp;
	player.lastDaily = now;
	addItem(player, "potion", rewards.potion);
	rewards.levels = addXp(player, rewards.xp);

	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		rewards,
	};
}

export async function buyShopItem(userId, name, itemInput, rawQuantity = 1) {
	const itemKey = normalizeItemKey(itemInput);

	if (!itemKey || !SHOP_ITEMS[itemKey] || SHOP_ITEMS[itemKey].hidden) {
		return {
			status: "invalid_item",
		};
	}

	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const player = loaded.player;
	const item = SHOP_ITEMS[itemKey];
	const quantity =
		item.type === "gear" ? 1 : clamp(toInt(rawQuantity, 1), 1, 10);
	const total = item.price * quantity;

	if (item.level && player.level < item.level) {
		return {
			status: "level_required",
			item,
			requiredLevel: item.level,
			player,
		};
	}

	if (player.gold < total) {
		return {
			status: "not_enough_gold",
			item,
			total,
			player,
		};
	}

	player.gold -= total;

	if (item.type === "gear") {
		player.gear[item.slot] = itemKey;
	} else {
		addItem(player, itemKey, quantity);
	}

	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		item,
		quantity,
		total,
	};
}

export async function craftItem(userId, name, recipeInput) {
	const recipeKey = normalizeItemKey(recipeInput);

	if (!recipeKey || !CRAFTING_RECIPES[recipeKey]) {
		return {
			status: "invalid_recipe",
		};
	}

	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const player = loaded.player;
	const recipe = CRAFTING_RECIPES[recipeKey];
	const item = SHOP_ITEMS[recipe.output];

	if (recipe.level && player.level < recipe.level) {
		return {
			status: "level_required",
			recipe,
			requiredLevel: recipe.level,
			player,
		};
	}

	if (player.gold < recipe.gold) {
		return {
			status: "not_enough_gold",
			recipe,
			total: recipe.gold,
			player,
		};
	}

	const missing = Object.entries(recipe.requires || {})
		.map(([key, amount]) => ({
			key,
			name: getItemName(key),
			amount,
			owned: toInt(player.items[key], 0),
		}))
		.filter((entry) => entry.owned < entry.amount);

	if (missing.length) {
		return {
			status: "missing_materials",
			recipe,
			missing,
			player,
		};
	}

	player.gold -= recipe.gold;

	for (const [key, amount] of Object.entries(recipe.requires || {})) {
		addItem(player, key, -amount);
	}

	if (item?.type === "gear") {
		player.gear[item.slot] = recipe.output;
	} else {
		addItem(player, recipe.output, recipe.quantity);
	}

	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		recipeKey,
		recipe,
		item,
	};
}

export async function sellItem(userId, name, itemInput, rawQuantity = 1) {
	const input = normalizeInput(itemInput);

	if (!input) {
		return {
			status: "invalid_item",
		};
	}

	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const player = loaded.player;
	const sellAll = ["all", "semua"].includes(input);

	if (sellAll) {
		const sold = [];
		let total = 0;

		for (const [key, amount] of Object.entries(player.items || {})) {
			const quantity = toInt(amount, 0);
			const price = getSellPrice(key);

			if (!price || quantity <= 0) {
				continue;
			}

			addItem(player, key, -quantity);
			total += price * quantity;
			sold.push({
				key,
				name: getItemName(key),
				quantity,
				price,
			});
		}

		if (!sold.length) {
			if (loaded.regened) {
				await savePlayer(userId, loaded.user, player, name);
			}

			return {
				status: "no_sellable_items",
				player,
			};
		}

		player.gold += total;
		const saved = await savePlayer(userId, loaded.user, player, name);

		return {
			status: "ok",
			player: saved,
			sold,
			total,
		};
	}

	const itemKey = normalizeItemKey(itemInput);
	const price = itemKey ? getSellPrice(itemKey) : null;

	if (!itemKey || !price) {
		return {
			status: "not_sellable",
		};
	}

	const owned = toInt(player.items[itemKey], 0);

	if (owned <= 0) {
		if (loaded.regened) {
			await savePlayer(userId, loaded.user, player, name);
		}

		return {
			status: "no_item",
			itemName: getItemName(itemKey),
			player,
		};
	}

	const quantity = ["all", "semua"].includes(normalizeInput(rawQuantity))
		? owned
		: clamp(toInt(rawQuantity, 1), 1, owned);
	const total = price * quantity;

	addItem(player, itemKey, -quantity);
	player.gold += total;

	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		sold: [
			{
				key: itemKey,
				name: getItemName(itemKey),
				quantity,
				price,
			},
		],
		total,
	};
}

export async function useConsumable(userId, name, itemInput = "potion") {
	const itemKey = normalizeItemKey(itemInput) || "potion";
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const player = loaded.player;
	const stats = getStats(player);

	if (!["potion", "ether"].includes(itemKey)) {
		return {
			status: "not_consumable",
		};
	}

	if (toInt(player.items[itemKey], 0) <= 0) {
		if (loaded.regened) {
			await savePlayer(userId, loaded.user, player, name);
		}

		return {
			status: "no_item",
			item: SHOP_ITEMS[itemKey],
			player,
		};
	}

	if (itemKey === "potion" && player.hp >= stats.maxHp) {
		return {
			status: "full",
			item: SHOP_ITEMS[itemKey],
			player,
		};
	}

	if (itemKey === "ether" && player.energy >= player.maxEnergy) {
		return {
			status: "full",
			item: SHOP_ITEMS[itemKey],
			player,
		};
	}

	addItem(player, itemKey, -1);

	if (itemKey === "potion") {
		player.hp = clamp(player.hp + 45, 0, stats.maxHp);
	}

	if (itemKey === "ether") {
		player.energy = clamp(player.energy + 25, 0, player.maxEnergy);
	}

	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		item: SHOP_ITEMS[itemKey],
		player: saved,
	};
}

export async function getLeaderboard(limit = 10) {
	const result = await getRpgLeaderboard(limit);

	if (result.status !== "ok") {
		return [];
	}

	return result.entries.map((entry) => ({
		...entry,
		player: normalizePlayer(entry.player, entry.name),
	}));
}

export function formatAdventureResult(result) {
	const won = result.battle.won;
	const outcome = won ? "Menang" : "Kalah";
	const icon = won ? "🏆" : "💀";
	const itemText = result.rewards.items.length
		? `\n🎁 Item: *${result.rewards.items.map(getItemName).join(", ")}*`
		: "";
	const levelText = result.rewards.levels.length
		? `\n⭐ Level up: *${result.rewards.levels.join(", ")}*`
		: "";
	const absorb = result.rewards.absorb;
	let absorbText = "";

	if (absorb?.status === "new") {
		absorbText = `\n🧬 Absorb: *${absorb.skill.name} Lv 1*${absorb.equipped ? " dipasang" : ""}`;
	} else if (absorb?.status === "level_up") {
		absorbText = `\n🧬 Absorb: *${absorb.skill.name} naik Lv ${absorb.level}*`;
	} else if (absorb?.status === "shard") {
		absorbText = `\n🧬 Absorb: shard *${absorb.skill.name}* ${absorb.shards}/${absorb.needed}`;
	}

	return [
		...chatHeader(
			icon,
			`${outcome} di ${result.monster.zone}`,
			`${result.monster.name} Lv ${result.monster.level}`
		),
		...sectionTitle("⚔️", "Battle"),
		`⏱️ Ronde: *${result.battle.rounds}*`,
		`🗡️ Damage: *${result.battle.damageGiven}* diberikan`,
		`🛡️ Diterima: *${result.battle.damageTaken}*`,
		...sectionTitle("🎁", "Reward"),
		`💰 Gold: *${formatNumber(result.rewards.gold)}*`,
		`⭐ XP: *${result.rewards.xp}*${itemText}${levelText}${absorbText}`,
		...sectionTitle("📌", "Status"),
		`❤️ HP: *${result.player.hp}* | ⚡ Energi: *${result.player.energy}*`,
	].join("\n");
}

export function formatJobResult(result) {
	const levelText = result.rewards.levels.length
		? `\n⭐ Level up: *${result.rewards.levels.join(", ")}*`
		: "";

	return [
		...chatHeader("🧰", `${result.job.name} Selesai`, "Kerja berhasil"),
		`💰 Gold: *${formatNumber(result.rewards.gold)}*`,
		`⭐ XP: *${result.rewards.xp}*`,
		`📦 Item: *${result.rewards.item} x${result.rewards.itemAmount}*${levelText}`,
		"",
		`⚡ Energi: *${result.player.energy}/${result.player.maxEnergy}*`,
	].join("\n");
}

export function formatDailyResult(result) {
	const levelText = result.rewards.levels.length
		? `\n⭐ Level up: *${result.rewards.levels.join(", ")}*`
		: "";

	return [
		...chatHeader("🎁", "Daily Reward", "Hadiah harian berhasil diambil"),
		`💰 Gold: *${formatNumber(result.rewards.gold)}*`,
		`⭐ XP: *${result.rewards.xp}*`,
		`🧪 Potion: *${result.rewards.potion}*${levelText}`,
		"",
		"❤️ HP dan ⚡ energi penuh.",
	].join("\n");
}

export function formatBuyResult(result) {
	const itemText =
		result.item.type === "gear"
			? `${result.item.name} dipasang ke slot ${result.item.slot}`
			: `${result.item.name} x${result.quantity}`;

	return [
		...chatHeader("🛒", "Pembelian Berhasil", itemText),
		`💰 Harga: *${formatNumber(result.total)} gold*`,
		`👛 Sisa gold: *${formatNumber(result.player.gold)}*`,
	].join("\n");
}

export function formatCraftResult(result) {
	const item = SHOP_ITEMS[result.recipe.output];
	const outputText =
		item?.type === "gear"
			? `${item.name} dipasang ke slot ${item.slot}`
			: `${getItemName(result.recipe.output)} x${result.recipe.quantity}`;

	return [
		...chatHeader("⚒️", "Craft Berhasil", outputText),
		`💰 Biaya: *${formatNumber(result.recipe.gold)} gold*`,
		`👛 Sisa gold: *${formatNumber(result.player.gold)}*`,
	].join("\n");
}

export function formatSellResult(result) {
	const rows = result.sold.map(
		(item) =>
			`📦 ${item.name} x${item.quantity}: *${formatNumber(item.price * item.quantity)} gold*`
	);

	return [
		...chatHeader("💰", "Jual Berhasil", "Item berhasil ditukar gold"),
		...rows,
		SUB_DIVIDER,
		`Total: *${formatNumber(result.total)} gold*`,
		`Gold: *${formatNumber(result.player.gold)}*`,
	].join("\n");
}

export function formatUseItemResult(result) {
	const stats = getStats(result.player);

	return [
		...chatHeader("🧪", `${result.item.name} Dipakai`, "Status dipulihkan"),
		`❤️ HP: *${result.player.hp}/${stats.maxHp}*`,
		`⚡ Energi: *${result.player.energy}/${result.player.maxEnergy}*`,
	].join("\n");
}

export function formatLeaderboard(entries, prefix = ".") {
	if (!entries.length) {
		return [
			...chatHeader(
				"🏆",
				`Leaderboard ${BRAND_CONFIG.name}`,
				"Belum ada karakter"
			),
			commandHint("Daftar", `${prefix}mulai warrior`),
		].join("\n");
	}

	const rows = entries.map((entry, index) => {
		const number = index + 1;
		const race = getRace(entry.player);
		const medal = ["🥇", "🥈", "🥉"][index] || `${number}.`;

		return [
			`${medal} *${entry.name}*`,
			`   🧬 ${race.name} Rank ${race.rank} | Lv ${entry.player.level}`,
			`   ⭐ ${entry.player.xp} XP | 💰 ${formatNumber(entry.player.gold)} gold`,
		].join("\n");
	});

	return [
		...chatHeader(
			"🏆",
			`Leaderboard ${BRAND_CONFIG.name}`,
			"Top petualang"
		),
		...rows,
	].join("\n");
}

export function formatCooldown(ms) {
	return formatDuration(ms);
}
