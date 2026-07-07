import { BRAND_CONFIG } from "#config/brand";
import * as db from "#lib/database/index";
import {
	bindWhatsAppToUser,
	getLatestCompletedRestoreSession,
	markRestoreSessionRestored,
} from "#lib/supabase/accountLinking";
import { addGuildPoints, getGuildStatusByWhatsApp } from "#lib/supabase/guilds";
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
const DAILY_STREAK_GRACE_MS = 2 * DAY_MS;
const COMEBACK_BONUS_AFTER_MS = 3 * DAY_MS;
const COMEBACK_BONUS_MAX_DAYS = 14;
const ENERGY_REGEN_MS = 10 * 60 * 1000;
const HP_REGEN_MS = 5 * 60 * 1000;
const WORLD_BOSS_DURATION_MS = 6 * 60 * 60 * 1000;
const WORLD_BOSS_RESPAWN_MS = 3 * 60 * 60 * 1000;
const WORLD_BOSS_ATTACK_COOLDOWN_MS = 5 * 60 * 1000;
const WORLD_BOSS_ENERGY_COST = 10;
const DUNGEON_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const DUNGEON_ENERGY_COST = 18;
const PET_MAX_LEVEL = 5;
const PET_SHARDS_PER_LEVEL = 2;
const PET_SUMMON_COST = {
	gold: 320,
	items: {
		pet_essence: 1,
	},
};
const GEAR_UPGRADE_MAX = 5;
const GEAR_UPGRADE_RULES = {
	weapon: {
		name: "Weapon",
		icon: "⚔️",
		material: "ore",
		baseGold: 140,
		goldStep: 70,
		baseMaterial: 3,
		materialStep: 2,
		bonuses: {
			attack: 2,
		},
	},
	armor: {
		name: "Armor",
		icon: "🛡️",
		material: "ore",
		baseGold: 130,
		goldStep: 65,
		baseMaterial: 4,
		materialStep: 2,
		bonuses: {
			maxHp: 8,
			defense: 2,
		},
	},
	charm: {
		name: "Charm",
		icon: "🔮",
		material: "fish",
		baseGold: 120,
		goldStep: 60,
		baseMaterial: 3,
		materialStep: 2,
		bonuses: {
			defense: 1,
			agility: 1,
		},
	},
};

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
		restoreHp: 45,
		description: "Pulihkan 45 HP.",
	},
	hi_potion: {
		name: "Hi-Potion",
		type: "consumable",
		price: 140,
		level: 4,
		restoreHp: 110,
		description: "Pulihkan 110 HP.",
	},
	ether: {
		name: "Ether",
		type: "consumable",
		price: 95,
		restoreEnergy: 25,
		description: "Pulihkan 25 energi.",
	},
	greater_ether: {
		name: "Greater Ether",
		type: "consumable",
		price: 185,
		level: 5,
		restoreEnergy: 60,
		description: "Pulihkan 60 energi.",
	},
	field_ration: {
		name: "Field Ration",
		type: "consumable",
		price: 165,
		level: 3,
		restoreHp: 55,
		restoreEnergy: 20,
		description: "Pulihkan 55 HP dan 20 energi.",
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
	guardian_armor: {
		name: "Guardian Armor",
		type: "gear",
		slot: "armor",
		price: 980,
		level: 8,
		description: "+16 DEF, +45 HP.",
		bonuses: {
			defense: 16,
			maxHp: 45,
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
	merchant_ring: {
		name: "Merchant Ring",
		type: "gear",
		slot: "charm",
		price: 880,
		level: 6,
		description: "+4 DEF, +4 AGI, +12 HP.",
		bonuses: {
			maxHp: 12,
			defense: 4,
			agility: 4,
		},
	},
};

const ITEM_ALIASES = {
	obat: "potion",
	pot: "potion",
	ramuan: "potion",
	hipot: "hi_potion",
	hi_potion: "hi_potion",
	hi: "hi_potion",
	energi: "ether",
	energy: "ether",
	gether: "greater_ether",
	greater: "greater_ether",
	greater_ether: "greater_ether",
	ration: "field_ration",
	bekal: "field_ration",
	pedang: "iron_sword",
	iron: "iron_sword",
	besi: "iron_sword",
	steel: "steel_blade",
	armor: "iron_armor",
	zirah: "iron_armor",
	guardian: "guardian_armor",
	charm: "hunter_charm",
	jimat: "hunter_charm",
	ring: "merchant_ring",
	cincin: "merchant_ring",
	ore: "ore",
	batu: "ore",
	bijih: "ore",
	herb: "herb",
	daun: "herb",
	fish: "fish",
	ikan: "fish",
	essence: "pet_essence",
	pet_essence: "pet_essence",
	inti: "pet_essence",
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
	pet_essence: {
		name: "Pet Essence",
		sellPrice: 60,
		description: "Inti liar untuk memanggil companion.",
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
	hi_potion: {
		name: "Hi-Potion Pack",
		output: "hi_potion",
		quantity: 2,
		level: 4,
		gold: 45,
		requires: {
			herb: 7,
			fish: 1,
		},
		description: "Hi-Potion x2.",
	},
	greater_ether: {
		name: "Greater Ether",
		output: "greater_ether",
		quantity: 1,
		level: 5,
		gold: 70,
		requires: {
			herb: 4,
			ore: 3,
		},
		description: "Greater Ether x1.",
	},
	field_ration: {
		name: "Field Ration",
		output: "field_ration",
		quantity: 2,
		level: 3,
		gold: 55,
		requires: {
			herb: 3,
			fish: 3,
		},
		description: "Field Ration x2.",
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
	merchant_ring: {
		name: "Merchant Ring",
		output: "merchant_ring",
		quantity: 1,
		level: 6,
		gold: 360,
		requires: {
			ore: 6,
			fish: 6,
		},
		description: "Charm Lv 6.",
	},
	guardian_armor: {
		name: "Guardian Armor",
		output: "guardian_armor",
		quantity: 1,
		level: 8,
		gold: 620,
		requires: {
			ore: 18,
			herb: 6,
		},
		description: "Armor Lv 8.",
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

const QUEST_RESET_MS = {
	beginner: Number.POSITIVE_INFINITY,
	daily: DAY_MS,
	weekly: 7 * DAY_MS,
};

const TAVERN_RESET_MS = {
	daily: DAY_MS,
	weekly: 7 * DAY_MS,
};

const QUEST_DEFINITIONS = {
	beginner_register: {
		key: "beginner_register",
		type: "beginner",
		lifetime: true,
		name: "Langkah Pertama",
		description: "Buat karakter RPG pertamamu.",
		metric: "registered",
		target: 1,
		rewards: {
			gold: 50,
			xp: 20,
			items: {
				potion: 1,
			},
		},
	},
	beginner_daily: {
		key: "beginner_daily",
		type: "beginner",
		lifetime: true,
		name: "Bekal Harian",
		description: "Klaim daily pertama.",
		metric: "dailies",
		target: 1,
		rewards: {
			gold: 80,
			xp: 25,
			items: {
				ether: 1,
			},
		},
	},
	beginner_guild: {
		key: "beginner_guild",
		type: "beginner",
		lifetime: true,
		name: "Pilih Jalur Guild",
		description: "Daftar ke salah satu guild.",
		metric: "guilds",
		target: 1,
		rewards: {
			gold: 90,
			xp: 35,
			items: {
				potion: 1,
			},
		},
	},
	beginner_hunt: {
		key: "beginner_hunt",
		type: "beginner",
		lifetime: true,
		name: "Jelajah Pertama",
		description: "Menangkan 1 pertarungan jelajah.",
		metric: "wins",
		target: 1,
		rewards: {
			gold: 100,
			xp: 45,
			items: {
				potion: 1,
			},
		},
	},
	beginner_work: {
		key: "beginner_work",
		type: "beginner",
		lifetime: true,
		name: "Kerja Pertama",
		description: "Selesaikan 1 kerja guild.",
		metric: "jobs",
		target: 1,
		rewards: {
			gold: 90,
			xp: 35,
			items: {
				herb: 2,
			},
		},
	},
	beginner_shop: {
		key: "beginner_shop",
		type: "beginner",
		lifetime: true,
		name: "Belanja Bekal",
		description: "Beli 1 item dari toko.",
		metric: "buys",
		target: 1,
		rewards: {
			gold: 75,
			xp: 25,
			items: {
				field_ration: 1,
			},
		},
	},
	beginner_craft: {
		key: "beginner_craft",
		type: "beginner",
		lifetime: true,
		name: "Craft Pertama",
		description: "Buat 1 item dari material.",
		metric: "crafts",
		target: 1,
		rewards: {
			gold: 130,
			xp: 55,
			items: {
				ore: 2,
			},
		},
	},
	beginner_upgrade: {
		key: "beginner_upgrade",
		type: "beginner",
		lifetime: true,
		name: "Tempa Pertama",
		description: "Upgrade 1 slot gear di blacksmith.",
		metric: "upgrades",
		target: 1,
		rewards: {
			gold: 120,
			xp: 50,
			items: {
				ore: 3,
			},
		},
	},
	daily_hunt: {
		key: "daily_hunt",
		type: "daily",
		name: "Buru Monster",
		description: "Menangkan 2 pertarungan jelajah.",
		metric: "wins",
		target: 2,
		rewards: {
			gold: 90,
			xp: 35,
			items: {
				potion: 1,
			},
		},
	},
	daily_work: {
		key: "daily_work",
		type: "daily",
		name: "Kerja Lapangan",
		description: "Selesaikan 2 kerja guild.",
		metric: "jobs",
		target: 2,
		rewards: {
			gold: 80,
			xp: 30,
			items: {
				ether: 1,
			},
		},
	},
	daily_supply: {
		key: "daily_supply",
		type: "daily",
		name: "Restock Bekal",
		description: "Beli 1 item dari toko.",
		metric: "buys",
		target: 1,
		rewards: {
			gold: 55,
			xp: 25,
			items: {
				field_ration: 1,
			},
		},
	},
	daily_dungeon: {
		key: "daily_dungeon",
		type: "daily",
		name: "Ruang Bawah Tanah",
		description: "Selesaikan 1 dungeon squad.",
		metric: "dungeons",
		target: 1,
		rewards: {
			gold: 120,
			xp: 55,
			items: {
				ether: 1,
			},
		},
	},
	weekly_hunter: {
		key: "weekly_hunter",
		type: "weekly",
		name: "Kontrak Pemburu",
		description: "Menangkan 12 pertarungan jelajah.",
		metric: "wins",
		target: 12,
		rewards: {
			gold: 520,
			xp: 220,
			items: {
				hi_potion: 2,
				ore: 3,
			},
		},
	},
	weekly_merchant: {
		key: "weekly_merchant",
		type: "weekly",
		name: "Kontrak Logistik",
		description: "Selesaikan 12 kerja.",
		metric: "jobs",
		target: 12,
		rewards: {
			gold: 480,
			xp: 210,
			items: {
				greater_ether: 1,
				fish: 3,
			},
		},
	},
	guild_adventurer_bounty: {
		key: "guild_adventurer_bounty",
		type: "guild",
		guild: "adventurer",
		name: "Bounty Petualang",
		description: "Menangkan 5 pertarungan untuk Guild Petualang.",
		metric: "wins",
		target: 5,
		points: 15,
		rewards: {
			gold: 240,
			xp: 110,
			items: {
				hi_potion: 1,
			},
		},
	},
	guild_merchant_order: {
		key: "guild_merchant_order",
		type: "guild",
		guild: "merchant",
		name: "Order Pedagang",
		description: "Selesaikan 5 kerja untuk Guild Pedagang.",
		metric: "jobs",
		target: 5,
		points: 15,
		rewards: {
			gold: 230,
			xp: 105,
			items: {
				greater_ether: 1,
			},
		},
	},
};

export const TAVERN_TASKS = {
	tavern_daily_checkin: {
		key: "tavern_daily_checkin",
		type: "daily",
		name: "Buka Hari",
		description: "Klaim daily reward.",
		metric: "dailies",
		target: 1,
		rewards: {
			gold: 70,
			xp: 22,
			items: {
				potion: 1,
			},
		},
	},
	tavern_daily_hunt: {
		key: "tavern_daily_hunt",
		type: "daily",
		name: "Patroli Tavern",
		description: "Menangkan 2 jelajah.",
		metric: "wins",
		target: 2,
		rewards: {
			gold: 110,
			xp: 36,
			items: {
				herb: 2,
			},
		},
	},
	tavern_daily_work: {
		key: "tavern_daily_work",
		type: "daily",
		name: "Bekal Guild",
		description: "Selesaikan 2 kerja.",
		metric: "jobs",
		target: 2,
		rewards: {
			gold: 105,
			xp: 32,
			items: {
				ore: 2,
			},
		},
	},
	tavern_daily_craft: {
		key: "tavern_daily_craft",
		type: "daily",
		name: "Meja Craft",
		description: "Craft 1 item.",
		metric: "crafts",
		target: 1,
		rewards: {
			gold: 95,
			xp: 28,
			items: {
				fish: 1,
			},
		},
	},
	tavern_daily_boss: {
		key: "tavern_daily_boss",
		type: "daily",
		name: "Panggilan Raid",
		description: "Serang World Boss 1 kali.",
		metric: "bossAttacks",
		target: 1,
		rewards: {
			gold: 130,
			xp: 42,
			items: {
				ether: 1,
			},
		},
	},
	tavern_weekly_active: {
		key: "tavern_weekly_active",
		type: "weekly",
		name: "Tavern Regular",
		description: "Selesaikan 15 aktivitas utama.",
		metric: "activityTotal",
		target: 15,
		rewards: {
			gold: 450,
			xp: 140,
			items: {
				hi_potion: 1,
				greater_ether: 1,
			},
		},
	},
	tavern_weekly_hunter: {
		key: "tavern_weekly_hunter",
		type: "weekly",
		name: "Hunter Mingguan",
		description: "Menangkan 12 jelajah.",
		metric: "wins",
		target: 12,
		rewards: {
			gold: 520,
			xp: 170,
			items: {
				ore: 5,
				herb: 5,
			},
		},
	},
	tavern_weekly_boss: {
		key: "tavern_weekly_boss",
		type: "weekly",
		name: "Raid Support",
		description: "Serang World Boss 5 kali.",
		metric: "bossAttacks",
		target: 5,
		rewards: {
			gold: 540,
			xp: 180,
			items: {
				pet_essence: 1,
			},
		},
	},
	tavern_weekly_dungeon: {
		key: "tavern_weekly_dungeon",
		type: "weekly",
		name: "Dungeon Crew",
		description: "Clear dungeon 1 kali.",
		metric: "dungeons",
		target: 1,
		rewards: {
			gold: 620,
			xp: 210,
			items: {
				field_ration: 2,
			},
		},
	},
};

export const TITLES = {
	rookie_adventurer: {
		name: "Rookie Adventurer",
		description: "Memulai perjalanan RPG Aetheria.",
		aliases: ["rookie", "pemula"],
	},
	monster_hunter: {
		name: "Monster Hunter",
		description: "Mulai dikenal sebagai pemburu monster.",
		aliases: ["hunter", "pemburu"],
	},
	field_worker: {
		name: "Field Worker",
		description: "Rajin mengambil kerja lapangan.",
		aliases: ["worker", "pekerja"],
	},
	daily_regular: {
		name: "Daily Regular",
		description: "Rutin mengurus bekal harian.",
		aliases: ["regular", "harian"],
	},
	apprentice_crafter: {
		name: "Apprentice Crafter",
		description: "Mulai menguasai crafting dasar.",
		aliases: ["crafter", "pengrajin"],
	},
	market_runner: {
		name: "Market Runner",
		description: "Sering belanja dan mengatur bekal.",
		aliases: ["market", "pasar"],
	},
	resource_trader: {
		name: "Resource Trader",
		description: "Aktif menjual resource hasil petualangan.",
		aliases: ["trader", "pedagang"],
	},
	rising_hero: {
		name: "Rising Hero",
		description: "Mencapai level awal yang solid.",
		aliases: ["hero", "pahlawan"],
	},
	wealthy_adventurer: {
		name: "Wealthy Adventurer",
		description: "Mengumpulkan modal besar dari petualangan.",
		aliases: ["wealthy", "kaya"],
	},
	companion_keeper: {
		name: "Companion Keeper",
		description: "Punya companion pertama.",
		aliases: ["keeper", "companion"],
	},
	beast_trainer: {
		name: "Beast Trainer",
		description: "Sering melatih dan memanggil companion.",
		aliases: ["trainer", "tamer"],
	},
	raid_initiate: {
		name: "Raid Initiate",
		description: "Mulai ikut pertarungan boss grup.",
		aliases: ["raid", "raider"],
	},
	boss_breaker: {
		name: "Boss Breaker",
		description: "Pernah memberi pukulan akhir ke World Boss.",
		aliases: ["breaker", "boss"],
	},
	dungeon_delver: {
		name: "Dungeon Delver",
		description: "Mulai menaklukkan dungeon bersama squad.",
		aliases: ["dungeon", "delver"],
	},
	blacksmith_apprentice: {
		name: "Blacksmith Apprentice",
		description: "Mulai menempa gear pribadi.",
		aliases: ["blacksmith", "smith", "tempa"],
	},
};

export const ACHIEVEMENTS = {
	first_steps: {
		key: "first_steps",
		name: "First Steps",
		description: "Buat karakter RPG pertama.",
		metric: "registered",
		target: 1,
		title: "rookie_adventurer",
	},
	novice_hunter: {
		key: "novice_hunter",
		name: "Novice Hunter",
		description: "Menangkan 5 pertarungan jelajah.",
		metric: "wins",
		target: 5,
		title: "monster_hunter",
	},
	hard_worker: {
		key: "hard_worker",
		name: "Hard Worker",
		description: "Selesaikan 5 kerja guild.",
		metric: "jobs",
		target: 5,
		title: "field_worker",
	},
	daily_regular: {
		key: "daily_regular",
		name: "Daily Regular",
		description: "Klaim daily 3 kali.",
		metric: "dailies",
		target: 3,
		title: "daily_regular",
	},
	apprentice_crafter: {
		key: "apprentice_crafter",
		name: "Apprentice Crafter",
		description: "Craft 3 item.",
		metric: "crafts",
		target: 3,
		title: "apprentice_crafter",
	},
	market_runner: {
		key: "market_runner",
		name: "Market Runner",
		description: "Beli 5 item dari toko.",
		metric: "buys",
		target: 5,
		title: "market_runner",
	},
	resource_trader: {
		key: "resource_trader",
		name: "Resource Trader",
		description: "Jual 15 item atau material.",
		metric: "sells",
		target: 15,
		title: "resource_trader",
	},
	rising_hero: {
		key: "rising_hero",
		name: "Rising Hero",
		description: "Capai level 5.",
		metric: "level",
		target: 5,
		title: "rising_hero",
	},
	wealthy_adventurer: {
		key: "wealthy_adventurer",
		name: "Wealthy Adventurer",
		description: "Miliki 5.000 gold.",
		metric: "gold",
		target: 5000,
		title: "wealthy_adventurer",
	},
	companion_keeper: {
		key: "companion_keeper",
		name: "Companion Keeper",
		description: "Miliki 1 companion.",
		metric: "pets",
		target: 1,
		title: "companion_keeper",
	},
	beast_trainer: {
		key: "beast_trainer",
		name: "Beast Trainer",
		description: "Summon companion 5 kali.",
		metric: "petSummons",
		target: 5,
		title: "beast_trainer",
	},
	raid_initiate: {
		key: "raid_initiate",
		name: "Raid Initiate",
		description: "Serang World Boss 3 kali.",
		metric: "bossAttacks",
		target: 3,
		title: "raid_initiate",
	},
	boss_breaker: {
		key: "boss_breaker",
		name: "Boss Breaker",
		description: "Beri pukulan akhir ke World Boss.",
		metric: "bossKills",
		target: 1,
		title: "boss_breaker",
	},
	dungeon_delver: {
		key: "dungeon_delver",
		name: "Dungeon Delver",
		description: "Selesaikan 3 dungeon squad.",
		metric: "dungeons",
		target: 3,
		title: "dungeon_delver",
	},
	blacksmith_apprentice: {
		key: "blacksmith_apprentice",
		name: "Blacksmith Apprentice",
		description: "Upgrade gear 3 kali.",
		metric: "upgrades",
		target: 3,
		title: "blacksmith_apprentice",
	},
};

export const PETS = {
	wolf_cub: {
		name: "Wolf Cub",
		icon: "🐺",
		description: "Companion agresif yang membantu damage fisik.",
		aliases: ["wolf", "serigala"],
		bonuses: {
			attack: 2,
			agility: 1,
		},
		growth: {
			attack: 1,
			agility: 1,
		},
	},
	fairy_sprout: {
		name: "Fairy Sprout",
		icon: "🧚",
		description: "Companion suportif yang membuat karakter lebih tahan.",
		aliases: ["fairy", "peri"],
		bonuses: {
			maxHp: 12,
			defense: 1,
		},
		growth: {
			maxHp: 5,
			defense: 1,
		},
	},
	owl_scout: {
		name: "Owl Scout",
		icon: "🦉",
		description: "Companion pengintai yang menambah kelincahan.",
		aliases: ["owl", "burung_hantu"],
		bonuses: {
			agility: 3,
		},
		growth: {
			agility: 2,
		},
	},
	mini_slime: {
		name: "Mini Slime",
		icon: "🫧",
		description: "Companion lentur yang memberi pertahanan stabil.",
		aliases: ["slime", "mini"],
		bonuses: {
			maxHp: 8,
			defense: 2,
		},
		growth: {
			maxHp: 4,
			defense: 1,
		},
	},
	spark_fox: {
		name: "Spark Fox",
		icon: "🦊",
		description: "Companion cepat dengan serangan petir kecil.",
		aliases: ["fox", "rubah"],
		bonuses: {
			attack: 1,
			agility: 3,
		},
		growth: {
			attack: 1,
			agility: 1,
		},
	},
};

const WORLD_BOSSES = [
	{
		key: "ember_drake",
		name: "Ember Drake",
		subtitle: "Api tua dari Padang Awan",
		icon: "🐉",
		level: 4,
		maxHp: 2200,
		attack: 22,
		defense: 8,
	},
	{
		key: "obsidian_colossus",
		name: "Obsidian Colossus",
		subtitle: "Penjaga batu dari Gua Arka",
		icon: "🗿",
		level: 6,
		maxHp: 2800,
		attack: 26,
		defense: 12,
	},
	{
		key: "storm_wraith",
		name: "Storm Wraith",
		subtitle: "Bayangan petir Hutan Lumina",
		icon: "🌩️",
		level: 5,
		maxHp: 2500,
		attack: 24,
		defense: 9,
	},
];

const DUNGEONS = [
	{
		key: "cloud_ruins",
		name: "Reruntuhan Awan",
		subtitle: "Dungeon pembuka untuk squad baru",
		minLevel: 1,
		rooms: [
			{ name: "Gerbang Retak", power: 72, damage: 12 },
			{ name: "Lorong Kabut", power: 92, damage: 16 },
			{ name: "Core Penjaga", power: 118, damage: 22 },
		],
	},
	{
		key: "lumina_depths",
		name: "Kedalaman Lumina",
		subtitle: "Akar bercahaya yang dijaga makhluk liar",
		minLevel: 4,
		rooms: [
			{ name: "Akar Terjalin", power: 130, damage: 20 },
			{ name: "Kolam Bulan", power: 158, damage: 25 },
			{ name: "Warden Lumina", power: 192, damage: 32 },
		],
	},
	{
		key: "arka_vault",
		name: "Vault Arka",
		subtitle: "Ruang batu tua dengan penjaga kristal",
		minLevel: 8,
		rooms: [
			{ name: "Pintu Granit", power: 210, damage: 30 },
			{ name: "Galeri Kristal", power: 250, damage: 38 },
			{ name: "Sentinel Arka", power: 305, damage: 48 },
		],
	},
];

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

function getGroupPayloads(group) {
	return isRecord(group?.payloads) ? group.payloads : {};
}

function emptyActivity() {
	return {
		wins: 0,
		jobs: 0,
		crafts: 0,
		sells: 0,
		buys: 0,
		dailies: 0,
		heals: 0,
		bossAttacks: 0,
		bossKills: 0,
		bossDamage: 0,
		dungeons: 0,
		petSummons: 0,
		upgrades: 0,
	};
}

function normalizeActivity(activity, fallback = {}) {
	return Object.fromEntries(
		Object.keys(emptyActivity()).map((key) => [
			key,
			Math.max(0, toInt(activity?.[key], fallback?.[key] || 0)),
		])
	);
}

function normalizeDailyStreak(streak = {}) {
	return {
		count: Math.max(0, toInt(streak?.count, 0)),
		best: Math.max(0, toInt(streak?.best, 0)),
		lastClaimAt: Math.max(0, toInt(streak?.lastClaimAt, 0)),
	};
}

function normalizeTavernState(tavern = {}) {
	const tasks = {};

	for (const [key, state] of Object.entries(tavern?.tasks || {})) {
		if (!TAVERN_TASKS[key]) {
			continue;
		}

		tasks[key] = {
			startedAt: Math.max(0, toInt(state?.startedAt, 0)),
			baseline: Math.max(0, toInt(state?.baseline, 0)),
			claimed: Boolean(state?.claimed),
		};
	}

	return {
		tasks,
	};
}

function getNextDailyStreak(player, now = Date.now()) {
	const previous = normalizeDailyStreak(player?.dailyStreak);
	const lastClaimAt = Math.max(
		previous.lastClaimAt,
		toInt(player?.lastDaily, 0)
	);
	const continued =
		lastClaimAt > 0 && now - lastClaimAt <= DAILY_STREAK_GRACE_MS;
	const count = continued ? previous.count + 1 : 1;

	return {
		count,
		best: Math.max(previous.best, count),
		lastClaimAt: now,
		reset: !continued && previous.count > 0,
	};
}

function getDailyStreakBonus(streakCount = 1) {
	const count = Math.max(1, toInt(streakCount, 1));
	const bonusDays = Math.max(0, Math.min(count - 1, 6));
	const items = {};

	if (count >= 3) {
		items.ether = 1;
	}

	if (count % 7 === 0) {
		items.pet_essence = 1;
	}

	return {
		gold: bonusDays * 20,
		xp: bonusDays * 8,
		items,
	};
}

function getComebackDailyBonus(player, now = Date.now()) {
	const lastDaily = Math.max(0, toInt(player?.lastDaily, 0));

	if (!lastDaily || now - lastDaily < COMEBACK_BONUS_AFTER_MS) {
		return null;
	}

	const inactiveDays = Math.max(3, Math.floor((now - lastDaily) / DAY_MS));
	const cappedDays = Math.min(inactiveDays, COMEBACK_BONUS_MAX_DAYS);
	const level = Math.max(1, toInt(player?.level, 1));
	const items = {
		ether: 1,
		potion: 1,
	};

	if (inactiveDays >= 7) {
		items.field_ration = 1;
	}

	return {
		name: "Return Supply",
		inactiveDays,
		gold: 120 + level * 20 + cappedDays * 30,
		xp: 40 + level * 8 + cappedDays * 12,
		items,
	};
}

function formatDailyStreakLabel(player) {
	const streak = normalizeDailyStreak(player?.dailyStreak);

	if (!streak.count) {
		return "Belum mulai";
	}

	return `${streak.count} hari (best ${streak.best})`;
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

function normalizeGearSlot(input) {
	const key = normalizeInput(input);
	const aliases = {
		armor: "armor",
		armour: "armor",
		baju: "armor",
		charm: "charm",
		cincin: "charm",
		jimat: "charm",
		pedang: "weapon",
		senjata: "weapon",
		weapon: "weapon",
		zireh: "armor",
		zirah: "armor",
	};

	return aliases[key] || null;
}

function normalizeGearUpgrades(upgrades = {}) {
	return Object.fromEntries(
		Object.keys(GEAR_UPGRADE_RULES).map((slot) => [
			slot,
			clamp(toInt(upgrades?.[slot], 0), 0, GEAR_UPGRADE_MAX),
		])
	);
}

function getGearUpgradeLevel(player, slot) {
	const upgrades = normalizeGearUpgrades(player?.gearUpgrades);

	return upgrades[slot] || 0;
}

function getGearUpgradeCost(slot, currentLevel = 0) {
	const rule = GEAR_UPGRADE_RULES[slot];
	const level = clamp(toInt(currentLevel, 0), 0, GEAR_UPGRADE_MAX);

	if (!rule || level >= GEAR_UPGRADE_MAX) {
		return {
			gold: 0,
			items: {},
		};
	}

	return {
		gold: rule.baseGold + rule.goldStep * level,
		items: {
			[rule.material]: rule.baseMaterial + rule.materialStep * level,
		},
	};
}

function getGearUpgradeBonus(slot, level = 0) {
	const rule = GEAR_UPGRADE_RULES[slot];
	const safeLevel = clamp(toInt(level, 0), 0, GEAR_UPGRADE_MAX);

	if (!rule || safeLevel <= 0) {
		return {};
	}

	return Object.fromEntries(
		Object.entries(rule.bonuses).map(([key, value]) => [
			key,
			value * safeLevel,
		])
	);
}

function formatStatBonuses(bonuses = {}) {
	const rows = Object.entries(bonuses).filter(([, value]) => value > 0);

	if (!rows.length) {
		return "-";
	}

	return rows
		.map(
			([key, value]) =>
				`${getStatIcon(key)} ${formatStatName(key)} +${value}`
		)
		.join(", ");
}

function addItem(player, itemKey, amount = 1) {
	player.items[itemKey] = toInt(player.items[itemKey], 0) + amount;

	if (player.items[itemKey] <= 0) {
		delete player.items[itemKey];
	}
}

function addActivity(player, metric, amount = 1) {
	player.activity = normalizeActivity(player.activity, {
		wins: player.wins,
		jobs: player.jobs,
	});
	player.activity[metric] = Math.max(
		0,
		toInt(player.activity[metric], 0) + amount
	);
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

function normalizeTitleKey(input) {
	const key = normalizeInput(input);

	if (!key) {
		return null;
	}

	for (const [titleKey, title] of Object.entries(TITLES)) {
		const aliases = Array.isArray(title.aliases) ? title.aliases : [];

		if (
			titleKey === key ||
			normalizeInput(title.name) === key ||
			aliases.some((alias) => normalizeInput(alias) === key)
		) {
			return titleKey;
		}
	}

	return null;
}

function normalizeAchievements(achievements = {}) {
	const unlocked = {};

	for (const [key, value] of Object.entries(achievements?.unlocked || {})) {
		if (ACHIEVEMENTS[key]) {
			unlocked[key] = Math.max(0, toInt(value, Date.now()));
		}
	}

	return {
		unlocked,
	};
}

function normalizeTitles(titles = {}) {
	const owned = {};

	for (const [key, value] of Object.entries(titles?.owned || {})) {
		if (TITLES[key]) {
			owned[key] = Math.max(0, toInt(value, Date.now()));
		}
	}

	const equipped = normalizeTitleKey(titles?.equipped);

	return {
		owned,
		equipped: equipped && owned[equipped] ? equipped : null,
	};
}

function getPlayerTitle(player) {
	const titles = normalizeTitles(player?.titles);
	const equipped = titles.equipped;

	if (equipped && TITLES[equipped]) {
		return TITLES[equipped].name;
	}

	return getRace(player).title;
}

function getAchievementMetric(player, metric, context = {}) {
	const activity = normalizeActivity(player.activity, {
		wins: player.wins,
		jobs: player.jobs,
	});

	switch (metric) {
		case "registered":
			return 1;
		case "level":
			return toInt(player.level, 1);
		case "gold":
			return toInt(player.gold, 0);
		case "guilds":
			return Object.keys(
				context.memberships || player.guild?.memberships || {}
			).length;
		case "pets":
			return Object.keys(normalizePets(player.pets).owned).length;
		default:
			return toInt(activity[metric], 0);
	}
}

function getAchievementProgress(player, achievement) {
	const current = getAchievementMetric(player, achievement.metric);

	return {
		...achievement,
		progress: clamp(current, 0, achievement.target),
		done: current >= achievement.target,
		unlocked: Boolean(player.achievements?.unlocked?.[achievement.key]),
		titleReward: achievement.title ? TITLES[achievement.title] : null,
	};
}

function unlockAchievements(player, now = Date.now()) {
	player.achievements = normalizeAchievements(player.achievements);
	player.titles = normalizeTitles(player.titles);

	const unlocked = [];

	for (const achievement of Object.values(ACHIEVEMENTS)) {
		if (player.achievements.unlocked[achievement.key]) {
			continue;
		}

		const progress = getAchievementProgress(player, achievement);

		if (!progress.done) {
			continue;
		}

		player.achievements.unlocked[achievement.key] = now;

		if (achievement.title && TITLES[achievement.title]) {
			player.titles.owned[achievement.title] = now;
		}

		unlocked.push(progress);
	}

	return unlocked;
}

function getAchievementRows(player) {
	return Object.values(ACHIEVEMENTS).map((achievement) =>
		getAchievementProgress(player, achievement)
	);
}

function getAchievementSummary(player) {
	const achievements = normalizeAchievements(player?.achievements);
	const total = Object.keys(ACHIEVEMENTS).length;
	const unlocked = Object.keys(achievements.unlocked).filter(
		(key) => ACHIEVEMENTS[key]
	).length;

	return {
		total,
		unlocked,
	};
}

function getTitleRows(player) {
	const titles = normalizeTitles(player?.titles);

	return Object.entries(TITLES).map(([key, title]) => ({
		key,
		...title,
		owned: Boolean(titles.owned[key]),
		equipped: titles.equipped === key,
	}));
}

function normalizePetKey(input) {
	const key = normalizeInput(input);

	if (!key) {
		return null;
	}

	for (const [petKey, pet] of Object.entries(PETS)) {
		const aliases = Array.isArray(pet.aliases) ? pet.aliases : [];

		if (
			petKey === key ||
			normalizeInput(pet.name) === key ||
			aliases.some((alias) => normalizeInput(alias) === key)
		) {
			return petKey;
		}
	}

	return null;
}

function normalizePets(pets = {}) {
	const owned = {};

	for (const [key, value] of Object.entries(pets?.owned || {})) {
		if (!PETS[key]) {
			continue;
		}

		owned[key] = {
			level: clamp(toInt(value?.level, 1), 1, PET_MAX_LEVEL),
			shards: Math.max(0, toInt(value?.shards, 0)),
			acquiredAt: Math.max(0, toInt(value?.acquiredAt, Date.now())),
		};
	}

	const equipped = normalizePetKey(pets?.equipped);

	return {
		owned,
		equipped: equipped && owned[equipped] ? equipped : null,
	};
}

function getPetBonuses(petKey, level = 1) {
	const pet = PETS[petKey];

	if (!pet) {
		return {};
	}

	const safeLevel = clamp(toInt(level, 1), 1, PET_MAX_LEVEL);
	const bonuses = {
		...(pet.bonuses || {}),
	};

	for (const [key, value] of Object.entries(pet.growth || {})) {
		bonuses[key] = toInt(bonuses[key], 0) + value * (safeLevel - 1);
	}

	return bonuses;
}

function getEquippedPet(player) {
	const pets = normalizePets(player?.pets);
	const petKey = pets.equipped;
	const owned = petKey ? pets.owned[petKey] : null;

	if (!petKey || !owned || !PETS[petKey]) {
		return null;
	}

	return {
		key: petKey,
		...PETS[petKey],
		level: owned.level,
		shards: owned.shards,
		bonuses: getPetBonuses(petKey, owned.level),
	};
}

function getPetRows(player) {
	const pets = normalizePets(player?.pets);

	return Object.entries(PETS).map(([key, pet]) => {
		const owned = pets.owned[key] || null;

		return {
			key,
			...pet,
			owned: Boolean(owned),
			equipped: pets.equipped === key,
			level: owned?.level || 1,
			shards: owned?.shards || 0,
			bonuses: getPetBonuses(key, owned?.level || 1),
		};
	});
}

function getPetSummary(player) {
	const pets = normalizePets(player?.pets);

	return {
		total: Object.keys(PETS).length,
		owned: Object.keys(pets.owned).length,
		equipped: pets.equipped,
	};
}

function formatPetBonuses(bonuses = {}) {
	const rows = Object.entries(bonuses).map(([key, value]) => {
		const sign = value >= 0 ? "+" : "";

		return `${formatStatName(key)} ${sign}${value}`;
	});

	return rows.join(", ") || "-";
}

function consumePetSummonCost(player) {
	const missing = [];

	if (player.gold < PET_SUMMON_COST.gold) {
		missing.push(
			`Gold ${formatNumber(player.gold)}/${formatNumber(PET_SUMMON_COST.gold)}`
		);
	}

	for (const [itemKey, amount] of Object.entries(PET_SUMMON_COST.items)) {
		const owned = toInt(player.items[itemKey], 0);

		if (owned < amount) {
			missing.push(`${getItemName(itemKey)} ${owned}/${amount}`);
		}
	}

	if (missing.length) {
		return {
			status: "missing_cost",
			missing,
		};
	}

	player.gold -= PET_SUMMON_COST.gold;

	for (const [itemKey, amount] of Object.entries(PET_SUMMON_COST.items)) {
		addItem(player, itemKey, -amount);
	}

	return {
		status: "ok",
	};
}

function grantPet(player, petKey, now = Date.now()) {
	player.pets = normalizePets(player.pets);

	const existing = player.pets.owned[petKey];

	if (!existing) {
		player.pets.owned[petKey] = {
			level: 1,
			shards: 0,
			acquiredAt: now,
		};

		if (!player.pets.equipped) {
			player.pets.equipped = petKey;
		}

		return {
			status: "new",
			key: petKey,
			pet: PETS[petKey],
			level: 1,
			shards: 0,
			levels: [],
		};
	}

	const levels = [];
	existing.shards += 1;

	while (
		existing.level < PET_MAX_LEVEL &&
		existing.shards >= PET_SHARDS_PER_LEVEL
	) {
		existing.shards -= PET_SHARDS_PER_LEVEL;
		existing.level += 1;
		levels.push(existing.level);
	}

	return {
		status: "duplicate",
		key: petKey,
		pet: PETS[petKey],
		level: existing.level,
		shards: existing.shards,
		levels,
	};
}

function normalizeBossParticipants(participants = {}) {
	const normalized = {};

	for (const [userId, participant] of Object.entries(participants || {})) {
		if (!userId || !isRecord(participant)) {
			continue;
		}

		normalized[userId] = {
			userId,
			name: cleanName(participant.name || "Adventurer"),
			damage: Math.max(0, toInt(participant.damage, 0)),
			attacks: Math.max(0, toInt(participant.attacks, 0)),
			lastAttackAt: Math.max(0, toInt(participant.lastAttackAt, 0)),
		};
	}

	return normalized;
}

function normalizeWorldBossState(state = {}) {
	const boss = isRecord(state?.current) ? state.current : null;

	if (!boss) {
		return {
			version: 1,
			current: null,
		};
	}

	return {
		version: 1,
		current: {
			key: normalizeInput(boss.key),
			name: String(boss.name || "World Boss"),
			subtitle: String(boss.subtitle || ""),
			icon: String(boss.icon || "⚔️"),
			level: Math.max(1, toInt(boss.level, 1)),
			maxHp: Math.max(1, toInt(boss.maxHp, 1)),
			hp: clamp(
				toInt(boss.hp, boss.maxHp),
				0,
				Math.max(1, toInt(boss.maxHp, 1))
			),
			attack: Math.max(1, toInt(boss.attack, 1)),
			defense: Math.max(0, toInt(boss.defense, 0)),
			status: boss.status === "defeated" ? "defeated" : "active",
			startedAt: Math.max(0, toInt(boss.startedAt, Date.now())),
			expiresAt: Math.max(0, toInt(boss.expiresAt, Date.now())),
			defeatedAt: Math.max(0, toInt(boss.defeatedAt, 0)),
			nextSpawnAt: Math.max(0, toInt(boss.nextSpawnAt, 0)),
			killer: isRecord(boss.killer) ? boss.killer : null,
			participants: normalizeBossParticipants(boss.participants),
		},
	};
}

function spawnWorldBoss(now = Date.now()) {
	const template = pick(WORLD_BOSSES);
	const hp = template.maxHp + roll(-120, 220);

	return {
		...template,
		maxHp: hp,
		hp,
		status: "active",
		startedAt: now,
		expiresAt: now + WORLD_BOSS_DURATION_MS,
		defeatedAt: 0,
		nextSpawnAt: 0,
		killer: null,
		participants: {},
	};
}

function getWorldBossTopDamage(boss, limit = 5) {
	return Object.values(boss?.participants || {})
		.filter((participant) => participant.damage > 0)
		.sort((a, b) => b.damage - a.damage)
		.slice(0, limit);
}

function getWorldBossStateStatus(state, now = Date.now()) {
	const boss = state.current;

	if (!boss) {
		return {
			status: "missing",
			boss: null,
		};
	}

	if (boss.status === "defeated" && boss.nextSpawnAt > now) {
		return {
			status: "cooldown",
			boss,
			remaining: boss.nextSpawnAt - now,
		};
	}

	if (boss.status === "active" && boss.hp > 0 && boss.expiresAt > now) {
		return {
			status: "active",
			boss,
			remaining: boss.expiresAt - now,
		};
	}

	return {
		status: "expired",
		boss,
	};
}

async function loadWorldBossState(groupId) {
	const group = await db.GroupModel.getGroup(groupId);
	const payloads = getGroupPayloads(group);

	return {
		group,
		state: normalizeWorldBossState(payloads.worldBoss),
	};
}

async function saveWorldBossState(groupId, group, state) {
	const payloads = {
		...getGroupPayloads(group),
		worldBoss: normalizeWorldBossState(state),
	};

	await db.GroupModel.setGroup(groupId, {
		...group,
		_id: groupId,
		payloads,
	});

	return payloads.worldBoss;
}

function getOrSpawnWorldBoss(state, now = Date.now()) {
	const status = getWorldBossStateStatus(state, now);

	if (status.status === "active" || status.status === "cooldown") {
		return status;
	}

	const boss = spawnWorldBoss(now);
	state.current = boss;

	return {
		status: "spawned",
		boss,
		remaining: boss.expiresAt - now,
	};
}

function calculateWorldBossDamage(player, boss) {
	const stats = getStats(player);
	const raw =
		Math.floor(stats.attack * roll(90, 130) * 0.01) +
		Math.floor(stats.agility * 0.35) +
		player.level * 3 -
		Math.floor(boss.defense * 0.45);

	return Math.max(18 + player.level, raw + roll(8, 24));
}

function calculateWorldBossCounterDamage(player, boss) {
	const stats = getStats(player);
	const raw = boss.attack + roll(0, 10) - Math.floor(stats.defense * 0.55);

	return clamp(
		raw,
		1,
		Math.max(12, Math.floor(getStats(player).maxHp * 0.3))
	);
}

function getWorldBossReward(boss, participant, rank, totalDamage, isKiller) {
	const share = totalDamage > 0 ? participant.damage / totalDamage : 0;
	const items = {};

	if (rank === 1) {
		items.ether = 1;
	}

	if (isKiller) {
		items.hi_potion = 1;
		items.pet_essence = 1;
	}

	if (!Object.keys(items).length) {
		items.potion = 1;
	}

	return {
		gold: Math.round(70 + boss.level * 18 + share * 260),
		xp: Math.round(35 + boss.level * 10 + share * 130),
		items,
		levels: [],
	};
}

function applyWorldBossReward(player, reward, participant, isKiller) {
	player.gold += reward.gold;

	for (const [itemKey, amount] of Object.entries(reward.items || {})) {
		addItem(player, itemKey, amount);
	}

	addActivity(player, "bossDamage", participant.damage);

	if (isKiller) {
		addActivity(player, "bossKills");
	}

	reward.levels = addXp(player, reward.xp);

	return reward;
}

function getDungeonForLevel(level = 1) {
	return (
		[...DUNGEONS].reverse().find((dungeon) => level >= dungeon.minLevel) ||
		DUNGEONS[0]
	);
}

function getDungeonPower(player) {
	const stats = getStats(player);

	return (
		Math.floor(stats.maxHp * 0.12) +
		stats.attack * 3 +
		Math.floor(stats.defense * 2.2) +
		Math.floor(stats.agility * 1.5) +
		player.level * 10
	);
}

function simulateDungeon(dungeon, members) {
	const averageLevel = Math.max(
		1,
		Math.round(
			members.reduce((sum, member) => sum + member.player.level, 0) /
				members.length
		)
	);
	const partyPower = members.reduce(
		(sum, member) => sum + getDungeonPower(member.player),
		0
	);
	const levelScale = Math.max(0, averageLevel - dungeon.minLevel);
	const rooms = [];
	let cleared = 0;
	let totalDamage = 0;

	for (const room of dungeon.rooms) {
		const target =
			room.power + levelScale * 16 + Math.max(0, members.length - 1) * 22;
		const rollPower =
			partyPower + roll(-20, 45 + Math.max(0, members.length - 1) * 18);
		const success = rollPower >= target;
		const damage = Math.max(
			1,
			Math.ceil(
				(room.damage + averageLevel * 2 + roll(0, 8)) /
					Math.max(1, members.length)
			)
		);

		totalDamage += damage;
		rooms.push({
			...room,
			target,
			rollPower,
			success,
			damage,
		});

		if (!success) {
			break;
		}

		cleared += 1;
	}

	return {
		averageLevel,
		partyPower,
		cleared,
		fullClear: cleared >= dungeon.rooms.length,
		totalDamage,
		rooms,
	};
}

function getDungeonReward(player, dungeon, simulation) {
	const roomCount = Math.max(0, simulation.cleared);
	const fullBonus = simulation.fullClear ? 1 : 0;
	const items = {};

	if (roomCount >= 1) {
		items.herb = roomCount;
	}

	if (roomCount >= 2) {
		items.ore = 1 + fullBonus;
	}

	if (simulation.fullClear) {
		items.pet_essence = 1;
	}

	return {
		gold:
			60 +
			dungeon.minLevel * 18 +
			player.level * 10 +
			roomCount * 45 +
			fullBonus * 90,
		xp:
			35 +
			dungeon.minLevel * 10 +
			player.level * 6 +
			roomCount * 38 +
			fullBonus * 70,
		items,
		levels: [],
	};
}

function applyDungeonReward(player, dungeon, simulation) {
	const reward = getDungeonReward(player, dungeon, simulation);

	player.gold += reward.gold;

	for (const [itemKey, amount] of Object.entries(reward.items || {})) {
		addItem(player, itemKey, amount);
	}

	if (simulation.fullClear) {
		addActivity(player, "dungeons");
	}

	reward.levels = addXp(player, reward.xp);

	return reward;
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

	for (const [slot, itemKey] of Object.entries(player.gear || {})) {
		const item = SHOP_ITEMS[itemKey];

		if (!item?.bonuses) {
			continue;
		}

		for (const [key, value] of Object.entries(item.bonuses)) {
			stats[key] = toInt(stats[key], 0) + value;
		}

		for (const [key, value] of Object.entries(
			getGearUpgradeBonus(slot, getGearUpgradeLevel(player, slot))
		)) {
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

	const pet = getEquippedPet(player);

	if (pet?.bonuses) {
		for (const [key, value] of Object.entries(pet.bonuses)) {
			stats[key] = toInt(stats[key], 0) + value;
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
	const equippedPet = getEquippedPet(normalized);

	return {
		characterName: normalized.name,
		classKey: normalized.class,
		className: STARTER_CLASSES[normalized.class]?.name || "Warrior",
		raceKey: getRaceKey(normalized),
		raceName: getRaceName(normalized),
		raceRank: getRace(normalized).rank,
		raceTitle: getRace(normalized).title,
		titleName: getPlayerTitle(normalized),
		achievementCount: getAchievementSummary(normalized).unlocked,
		pet: equippedPet
			? {
					key: equippedPet.key,
					name: equippedPet.name,
					level: equippedPet.level,
					icon: equippedPet.icon,
				}
			: null,
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
		gearUpgrades: normalizeGearUpgrades(player?.gearUpgrades),
		skills: normalizeSkills(player?.skills, level),
		wins: Math.max(0, toInt(player?.wins, 0)),
		losses: Math.max(0, toInt(player?.losses, 0)),
		jobs: Math.max(0, toInt(player?.jobs, 0)),
		activity: normalizeActivity(player?.activity, {
			wins: player?.wins,
			jobs: player?.jobs,
		}),
		quests: isRecord(player?.quests) ? player.quests : {},
		achievements: normalizeAchievements(player?.achievements),
		titles: normalizeTitles(player?.titles),
		pets: normalizePets(player?.pets),
		dailyStreak: normalizeDailyStreak(player?.dailyStreak),
		tavern: normalizeTavernState(player?.tavern),
		lastDungeon: Math.max(0, toInt(player?.lastDungeon, 0)),
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
		gearUpgrades: normalizeGearUpgrades(),
		skills: {
			owned: {},
			equipped: [],
		},
		wins: 0,
		losses: 0,
		jobs: 0,
		activity: emptyActivity(),
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
		dailyStreak: {
			count: 0,
			best: 0,
			lastClaimAt: 0,
		},
		tavern: {
			tasks: {},
		},
		lastDungeon: 0,
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

function questResetMs(type) {
	return QUEST_RESET_MS[type] || QUEST_RESET_MS.daily;
}

function getQuestDefinitions(type = "all") {
	const normalized = normalizeInput(type);

	return Object.values(QUEST_DEFINITIONS).filter(
		(quest) => normalized === "all" || quest.type === normalized
	);
}

function getQuestMetric(player, metric, context = {}) {
	return getAchievementMetric(player, metric, context);
}

function getQuestState(player, quest, now = Date.now(), context = {}) {
	const lifetime = Boolean(quest.lifetime);
	const current = getQuestMetric(player, quest.metric, context);
	const existing = isRecord(player.quests?.[quest.key])
		? player.quests[quest.key]
		: null;
	const resetMs = questResetMs(quest.type);
	const expired =
		!lifetime &&
		(!existing?.startedAt || now - toInt(existing.startedAt, 0) >= resetMs);

	if (!existing || expired) {
		return {
			startedAt: now,
			baseline: lifetime ? 0 : current,
			claimed: false,
		};
	}

	return {
		startedAt: toInt(existing.startedAt, now),
		baseline: toInt(existing.baseline, lifetime ? 0 : current),
		claimed: Boolean(existing.claimed),
	};
}

function normalizeQuestBook(player, now = Date.now(), context = {}) {
	player.quests = isRecord(player.quests) ? player.quests : {};

	for (const quest of Object.values(QUEST_DEFINITIONS)) {
		player.quests[quest.key] = getQuestState(player, quest, now, context);
	}

	return player.quests;
}

function getQuestProgress(player, quest, now = Date.now(), context = {}) {
	const state = getQuestState(player, quest, now, context);
	const current = getQuestMetric(player, quest.metric, context);
	const progress = clamp(current - state.baseline, 0, quest.target);

	return {
		...quest,
		state,
		progress,
		ready: progress >= quest.target && !state.claimed,
		done: progress >= quest.target,
		claimed: state.claimed,
		remainingMs: questResetMs(quest.type) - (now - state.startedAt),
	};
}

function applyQuestRewards(player, quest) {
	const rewards = quest.rewards || {};
	const gold = Math.max(0, toInt(rewards.gold, 0));
	const xp = Math.max(0, toInt(rewards.xp, 0));
	const items = rewards.items || {};

	player.gold += gold;

	for (const [itemKey, amount] of Object.entries(items)) {
		addItem(player, itemKey, amount);
	}

	return {
		gold,
		xp,
		items,
		levels: addXp(player, xp),
	};
}

function tavernResetMs(type) {
	return TAVERN_RESET_MS[type] || TAVERN_RESET_MS.daily;
}

function getTavernDefinitions(type = "all") {
	const normalized = normalizeInput(type);

	return Object.values(TAVERN_TASKS).filter(
		(task) => normalized === "all" || task.type === normalized
	);
}

function getTavernMetric(player, metric) {
	const activity = normalizeActivity(player.activity, {
		wins: player.wins,
		jobs: player.jobs,
	});

	if (metric === "activityTotal") {
		return [
			"dailies",
			"wins",
			"jobs",
			"crafts",
			"bossAttacks",
			"dungeons",
			"upgrades",
		].reduce((total, key) => total + toInt(activity[key], 0), 0);
	}

	return getAchievementMetric(player, metric);
}

function getTavernTaskState(player, task, now = Date.now()) {
	player.tavern = normalizeTavernState(player.tavern);

	const current = getTavernMetric(player, task.metric);
	const existing = isRecord(player.tavern.tasks?.[task.key])
		? player.tavern.tasks[task.key]
		: null;
	const resetMs = tavernResetMs(task.type);
	const expired =
		!existing?.startedAt || now - toInt(existing.startedAt, 0) >= resetMs;

	if (!existing) {
		return {
			startedAt: now,
			baseline: 0,
			claimed: false,
		};
	}

	if (expired) {
		return {
			startedAt: now,
			baseline: current,
			claimed: false,
		};
	}

	return {
		startedAt: toInt(existing.startedAt, now),
		baseline: toInt(existing.baseline, current),
		claimed: Boolean(existing.claimed),
	};
}

function normalizeTavernBoard(player, now = Date.now()) {
	player.tavern = normalizeTavernState(player.tavern);

	for (const task of Object.values(TAVERN_TASKS)) {
		player.tavern.tasks[task.key] = getTavernTaskState(player, task, now);
	}

	return player.tavern;
}

function getTavernTaskProgress(player, task, now = Date.now()) {
	const state = getTavernTaskState(player, task, now);
	const current = getTavernMetric(player, task.metric);
	const progress = clamp(current - state.baseline, 0, task.target);

	return {
		...task,
		state,
		progress,
		ready: progress >= task.target && !state.claimed,
		done: progress >= task.target,
		claimed: state.claimed,
		remainingMs: Math.max(
			0,
			tavernResetMs(task.type) - (now - state.startedAt)
		),
	};
}

function applyTavernRewards(player, task) {
	const rewards = task.rewards || {};
	const gold = Math.max(0, toInt(rewards.gold, 0));
	const xp = Math.max(0, toInt(rewards.xp, 0));
	const items = rewards.items || {};

	player.gold += gold;

	for (const [itemKey, amount] of Object.entries(items)) {
		addItem(player, itemKey, amount);
	}

	return {
		gold,
		xp,
		items,
		levels: addXp(player, xp),
	};
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
	const normalized = normalizePlayer(player, name || user?.name);
	unlockAchievements(normalized);

	const next = {
		...normalized,
		updatedAt: Date.now(),
	};

	await syncRpgProfileSnapshot(userId, createDashboardSnapshot(next));

	return next;
}

async function savePlayer(userId, user, player, name) {
	return writePlayer(userId, user, player, name);
}

async function forceSavePlayer(userId, player, name) {
	const normalized = normalizePlayer(player, name);
	unlockAchievements(normalized);

	const next = {
		...normalized,
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
	const formatItem = ([key, item]) => {
		const levelText = item.level ? ` Lv ${item.level}` : "";
		return [
			`🛒 *${key}* - ${item.name}${levelText}`,
			`   💰 ${formatNumber(item.price)} gold | ${item.description}`,
		].join("\n");
	};
	const visibleItems = Object.entries(SHOP_ITEMS).filter(
		([, item]) => !item.hidden
	);
	const consumables = visibleItems
		.filter(([, item]) => item.type === "consumable")
		.map(formatItem);
	const gear = visibleItems
		.filter(([, item]) => item.type === "gear")
		.map(formatItem);

	return [
		...chatHeader("🛍️", `Toko ${BRAND_CONFIG.name}`, "Gear dan consumable"),
		...sectionTitle("🧪", "Consumable"),
		...consumables,
		...sectionTitle("🧰", "Gear"),
		...gear,
		"",
		commandHint("Beli item", `${prefix}beli potion 2`),
		commandHint("Craft item", `${prefix}craft list`),
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

export function formatBestiary(result, prefix = ".") {
	if (result.status === "invalid_zone") {
		return [
			...chatHeader("📖", "Bestiary Tidak Ditemukan", "Zona tidak valid"),
			commandHint("Lihat map", `${prefix}map`),
			commandHint("Lihat bestiary aktif", `${prefix}bestiary`),
		].join("\n");
	}

	if (result.status === "locked") {
		return [
			...chatHeader(
				"🔒",
				"Bestiary Terkunci",
				`${result.zone.name} butuh Lv ${result.requiredLevel}`
			),
			`Level kamu: *${result.player.level}*`,
			"",
			commandHint("Lihat map", `${prefix}map`),
		].join("\n");
	}

	const zones = result.zones || [];
	const rows = zones.flatMap((zone) => [
		...sectionTitle(
			result.activeZoneKey === getZoneKey(zone) ? "✅" : "📍",
			`${zone.name} - Lv ${zone.minLevel}+`
		),
		...zone.monsters.flatMap((monster) => {
			const skill = monster.skill ? SKILLS[monster.skill] : null;
			const absorb = skill
				? `${skill.name} (${Math.round((monster.absorbChance || 0) * 100)}%)`
				: "Tidak ada";

			return [
				`• *${monster.name}*`,
				`  HP ${monster.hp} | ATK ${monster.attack} | DEF ${monster.defense} | AGI ${monster.agility}`,
				`  Absorb: ${absorb}`,
			];
		}),
	]);

	return [
		...chatHeader(
			"📖",
			`Bestiary ${BRAND_CONFIG.name}`,
			"Data monster dan skill absorb"
		),
		...rows,
		"",
		commandHint("Jelajah", `${prefix}jelajah`),
		commandHint("Zona lain", `${prefix}bestiary <zona|semua>`),
	].join("\n");
}

export function buildBestiaryTable(result, prefix = ".") {
	if (result.status !== "ok" || !result.zones?.length) {
		return null;
	}

	const rows = [
		["Monster", "HP", "ATK", "DEF", "AGI", "Absorb"],
		...result.zones.flatMap((zone) =>
			zone.monsters.map((monster) => {
				const skill = monster.skill ? SKILLS[monster.skill] : null;
				const absorb = skill
					? `${skill.name} ${Math.round((monster.absorbChance || 0) * 100)}%`
					: "-";

				return [
					monster.name,
					String(monster.hp),
					String(monster.attack),
					String(monster.defense),
					String(monster.agility),
					absorb,
				];
			})
		),
	];

	const zoneText =
		result.zones.length === 1
			? result.zones[0].name
			: `${result.zones.length} zona terbuka`;

	return {
		disclaimerText: "Aetheria Bestiary",
		headerText: `## ${zoneText}`,
		contentText: "Stat dasar monster dan peluang absorb skill.",
		title: "Monster Stats",
		table: rows,
		noHeading: false,
		footerText: `Gunakan ${prefix}bestiary <zona> untuk detail teks.`,
	};
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
		`⚔️ Weapon: *${getGearName(player.gear.weapon)}* +${getGearUpgradeLevel(player, "weapon")}`,
		`🛡️ Armor: *${getGearName(player.gear.armor)}* +${getGearUpgradeLevel(player, "armor")}`,
		`🔮 Charm: *${getGearName(player.gear.charm)}* +${getGearUpgradeLevel(player, "charm")}`,
		...sectionTitle("🎮", "Aksi"),
		itemBullet("craft - buat item dari material", "•"),
		itemBullet("upgrade - tempa gear yang dipakai", "•"),
		itemBullet("jual - tukar material/item jadi gold", "•"),
	].join("\n");
}

function formatGearUpgradeCost(cost = {}) {
	const rows = [];

	if (cost.gold) {
		rows.push(`${formatNumber(cost.gold)} gold`);
	}

	for (const [itemKey, amount] of Object.entries(cost.items || {})) {
		rows.push(`${getItemName(itemKey)} x${amount}`);
	}

	return rows.join(", ") || "-";
}

function getGearUpgradeRows(player) {
	return Object.entries(GEAR_UPGRADE_RULES).map(([slot, rule]) => {
		const level = getGearUpgradeLevel(player, slot);
		const equippedKey = player.gear?.[slot] || null;
		const equipped = equippedKey ? SHOP_ITEMS[equippedKey] : null;
		const cost = getGearUpgradeCost(slot, level);

		return {
			slot,
			rule,
			level,
			maxLevel: GEAR_UPGRADE_MAX,
			gearName: equipped?.name || "-",
			hasGear: Boolean(equipped),
			bonus: getGearUpgradeBonus(slot, level),
			nextBonus: getGearUpgradeBonus(slot, level + 1),
			cost,
			maxed: level >= GEAR_UPGRADE_MAX,
		};
	});
}

export function formatGearUpgradeStatus(result, prefix = ".") {
	const rows = getGearUpgradeRows(result.player).flatMap((entry) => {
		const status = entry.maxed
			? "Maksimal"
			: `Next: ${formatGearUpgradeCost(entry.cost)}`;
		const bonus = formatStatBonuses(entry.bonus);
		const action = entry.hasGear
			? commandHint("Tempa", `${prefix}upgrade ${entry.slot}`)
			: "↳ Slot belum punya gear.";

		return [
			`${entry.rule.icon} *${entry.rule.name}* +${entry.level}/${entry.maxLevel}`,
			`   Gear: *${entry.gearName}*`,
			`   Bonus: ${bonus}`,
			`   ${status}`,
			`   ${action}`,
		];
	});

	return [
		...chatHeader(
			"⚒️",
			`Gear Upgrade ${result.player.name}`,
			"Upgrade permanen per slot gear"
		),
		...rows,
		"",
		commandHint("Inventory", `${prefix}inv`),
	].join("\n");
}

export function formatGearUpgradeResult(result, prefix = ".") {
	const bonus = formatStatBonuses(
		getGearUpgradeBonus(result.slot, result.newLevel)
	);

	return [
		...chatHeader(
			"⚒️",
			"Gear Berhasil Ditempa",
			`${result.rule.name} +${result.oldLevel} -> +${result.newLevel}`
		),
		`🧰 Gear: *${result.gearName}*`,
		`💸 Biaya: *${formatGearUpgradeCost(result.cost)}*`,
		`✨ Bonus slot sekarang: ${bonus}`,
		`💰 Gold tersisa: *${formatNumber(result.player.gold)}*`,
		"",
		commandHint("Lihat semua upgrade", `${prefix}upgrade`),
		commandHint("Cek profil", `${prefix}profil`),
	].join("\n");
}

export function formatGearUpgradeFailure(result, prefix = ".") {
	if (result.status === "invalid_slot") {
		return [
			"⚒️ *Slot tidak dikenal.*",
			`Pakai: \`${prefix}upgrade weapon\`, \`${prefix}upgrade armor\`, atau \`${prefix}upgrade charm\`.`,
		].join("\n");
	}

	if (result.status === "empty_slot") {
		return [
			`⚒️ *${result.rule.name} belum terpasang.*`,
			`Beli atau craft gear dulu: \`${prefix}shop\` / \`${prefix}craft\``,
		].join("\n");
	}

	if (result.status === "max_level") {
		return [
			`⚒️ *${result.rule.name} sudah maksimal.*`,
			`Level upgrade: *+${GEAR_UPGRADE_MAX}*`,
		].join("\n");
	}

	if (result.status === "not_enough_resource") {
		const missing = result.missing
			.map(
				(item) =>
					`${item.icon} ${item.name}: *${formatNumber(item.owned)}/${formatNumber(item.amount)}*`
			)
			.join("\n");

		return [
			"📦 *Resource Upgrade Kurang*",
			`Biaya: *${formatGearUpgradeCost(result.cost)}*`,
			missing,
			"",
			commandHint("Cari material", `${prefix}kerja mine`),
			commandHint("Cek inventory", `${prefix}inv`),
		].join("\n");
	}

	return `⚒️ Upgrade gagal. Coba cek: \`${prefix}upgrade\``;
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
	const titleName = getPlayerTitle(player);
	const achievementSummary = getAchievementSummary(player);
	const pet = getEquippedPet(player);
	const petLabel = pet
		? `${pet.icon} ${pet.name} Lv ${pet.level}`
		: "Belum ada";
	const streakLabel = formatDailyStreakLabel(player);
	const guildLabel = player.guild?.label || "Belum daftar";
	const squadLabel = player.squad?.name
		? `${player.squad.name} (${player.squad.memberCount}/${player.squad.maxMembers})`
		: "Belum ada";
	const gearUpgradeLabel = [
		`W+${getGearUpgradeLevel(player, "weapon")}`,
		`A+${getGearUpgradeLevel(player, "armor")}`,
		`C+${getGearUpgradeLevel(player, "charm")}`,
	].join(" ");
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
		`🏷️ Title: *${titleName}*`,
		`🏅 Achievement: *${achievementSummary.unlocked}/${achievementSummary.total}*`,
		`🐾 Pet: *${petLabel}*`,
		`🔥 Daily Streak: *${streakLabel}*`,
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
		`⚒️ Gear Upgrade: *${gearUpgradeLabel}*`,
		`✨ Skill: *${skillText}*`,
		`🏆 Win *${player.wins}*  💀 Lose *${player.losses}*  🧰 Job *${player.jobs}*`,
		"",
		commandHint(
			"Aksi",
			`${prefix}jelajah | ${prefix}skill | ${prefix}race`
		),
	].join("\n");
}

function getGuidePlayer(player) {
	const normalized = normalizePlayer(player, player?.name || "Adventurer");

	return {
		...normalized,
		guild: player?.guild,
		premium: player?.premium,
		squad: player?.squad,
	};
}

function getBeginnerQuestSummary(player) {
	const quests = getQuestDefinitions("beginner").map((quest) =>
		getQuestProgress(player, quest)
	);

	return {
		total: quests.length,
		done: quests.filter((quest) => quest.done).length,
		ready: quests.filter((quest) => quest.ready),
		open: quests.filter((quest) => !quest.done),
	};
}

function isDailyReady(player) {
	return !player.lastDaily || Date.now() - player.lastDaily >= DAY_MS;
}

function getDailyStatusText(player) {
	if (isDailyReady(player)) {
		return "Siap diklaim sekarang.";
	}

	return `Reset dalam ${formatDuration(DAY_MS - (Date.now() - player.lastDaily))}.`;
}

function formatInactiveTime(lastDaily, now = Date.now()) {
	if (!lastDaily) {
		return "belum pernah absen";
	}

	const elapsed = Math.max(0, now - lastDaily);
	const days = Math.floor(elapsed / DAY_MS);

	if (days > 0) {
		return `${days} hari lalu`;
	}

	return `${formatDuration(elapsed)} lalu`;
}

function getGuildMembershipCount(player) {
	const memberships = player?.guild?.memberships;

	if (Array.isArray(memberships)) {
		return memberships.length;
	}

	if (isRecord(memberships)) {
		return Object.keys(memberships).length;
	}

	return 0;
}

function guideTask(title, detail, command) {
	return [
		`• *${title}*`,
		`  ${detail}`,
		command ? `  ${commandHint("Aksi", command)}` : "",
	]
		.filter(Boolean)
		.join("\n");
}

function progressCheck(done, label, detail) {
	return `${done ? "✅" : "▫️"} *${label}* - ${detail}`;
}

function getPrimaryGuideTasks(player, prefix) {
	const stats = getStats(player);
	const quests = getBeginnerQuestSummary(player);
	const activity = normalizeActivity(player.activity, {
		wins: player.wins,
		jobs: player.jobs,
	});
	const pets = normalizePets(player.pets);
	const skills = normalizeSkills(player.skills, player.level);
	const ownedSkillCount = getOwnedSkillKeys({
		...player,
		skills,
	}).length;
	const tasks = [];

	if (quests.ready.length) {
		tasks.push(
			guideTask(
				"Klaim Reward Misi",
				`${quests.ready.length} misi sudah selesai dan belum diambil.`,
				`${prefix}misi claim`
			)
		);
	} else if (quests.open.length) {
		const nextQuest = quests.open[0];
		tasks.push(
			guideTask(
				`Lanjutkan ${nextQuest.name}`,
				nextQuest.description,
				`${prefix}misi pemula`
			)
		);
	}

	if (isDailyReady(player)) {
		tasks.push(
			guideTask(
				"Ambil Bekal Harian",
				"Daily mengisi HP/energi dan memberi gold, XP, potion.",
				`${prefix}daily`
			)
		);
	}

	if (player.hp < Math.ceil(stats.maxHp * 0.35)) {
		tasks.push(
			guideTask(
				"Pulihkan HP",
				`HP kamu ${player.hp}/${stats.maxHp}; jangan paksakan jelajah.`,
				`${prefix}heal`
			)
		);
	}

	if (player.energy < 20) {
		tasks.push(
			guideTask(
				"Pulihkan Energi",
				`Energi kamu ${player.energy}/${player.maxEnergy}; pakai ether atau tunggu regen.`,
				`${prefix}heal ether`
			)
		);
	}

	if (!getGuildMembershipCount(player)) {
		tasks.push(
			guideTask(
				"Pilih Guild",
				"Guild membuka misi guild dan arah roleplay jangka panjang.",
				`${prefix}guild`
			)
		);
	}

	if (activity.wins < 2 || player.level < 3) {
		tasks.push(
			guideTask(
				"Naikkan Level Awal",
				"Jelajah memberi XP, gold, drop material, dan peluang absorb skill.",
				`${prefix}jelajah`
			)
		);
	}

	if (ownedSkillCount === 0) {
		tasks.push(
			guideTask(
				"Cari Skill Monster",
				"Menang jelajah bisa membuka shard skill untuk dipakai di build.",
				`${prefix}skill`
			)
		);
	} else if (!skills.equipped.length) {
		tasks.push(
			guideTask(
				"Pasang Skill",
				"Kamu sudah punya skill, tetapi belum ada yang aktif.",
				`${prefix}skill equip <skill>`
			)
		);
	}

	if (getGearUpgradeLevel(player, "weapon") === 0 && player.gear?.weapon) {
		tasks.push(
			guideTask(
				"Tempa Weapon",
				`Upgrade pertama butuh ${formatGearUpgradeCost(getGearUpgradeCost("weapon", 0))}.`,
				`${prefix}upgrade weapon`
			)
		);
	}

	if (!Object.keys(pets.owned).length) {
		tasks.push(
			guideTask(
				"Cari Companion",
				"Pet memberi bonus stat permanen saat dipakai.",
				`${prefix}pet summon`
			)
		);
	}

	if (!player.squad?.name) {
		tasks.push(
			guideTask(
				"Bentuk Squad",
				"Squad membuka dungeon dan progres kooperatif.",
				`${prefix}squad`
			)
		);
	} else {
		tasks.push(
			guideTask(
				"Jalankan Dungeon",
				"Dungeon squad memberi reward besar dan progress misi harian.",
				`${prefix}dungeon`
			)
		);
	}

	if (!tasks.length) {
		tasks.push(
			guideTask(
				"Loop Farming",
				"Jaga daily, misi, upgrade, boss, pet, dan dungeon tetap berjalan.",
				`${prefix}misi`
			)
		);
	}

	return tasks.slice(0, 6);
}

export function formatPlayerGuide(player, prefix = ".") {
	const displayPlayer = getGuidePlayer(player);
	const stats = getStats(displayPlayer);
	const nextXp = xpToNext(displayPlayer.level);
	const zone = getActiveZone(displayPlayer);
	const quests = getBeginnerQuestSummary(displayPlayer);
	const achievementSummary = getAchievementSummary(displayPlayer);
	const pet = getEquippedPet(displayPlayer);
	const guildLabel = displayPlayer.guild?.label || "Belum daftar";
	const squadLabel = displayPlayer.squad?.name || "Belum ada";
	const streakLabel = formatDailyStreakLabel(displayPlayer);
	const tasks = getPrimaryGuideTasks(displayPlayer, prefix);

	return [
		...chatHeader(
			"🧭",
			`Aetheria Guide ${displayPlayer.name}`,
			"Prioritas bermain berdasarkan progress karakter"
		),
		`⭐ Lv *${displayPlayer.level}* | XP *${displayPlayer.xp}/${nextXp}* | Map *${zone.name}*`,
		`❤️ HP *${displayPlayer.hp}/${stats.maxHp}* | ⚡ EN *${displayPlayer.energy}/${displayPlayer.maxEnergy}* | 💰 Gold *${formatNumber(displayPlayer.gold)}*`,
		`📜 Pemula *${quests.done}/${quests.total}* | 🏅 Achievement *${achievementSummary.unlocked}/${achievementSummary.total}*`,
		`🔥 Streak *${streakLabel}* | 🏛️ Guild *${guildLabel}*`,
		`👥 Squad *${squadLabel}* | 🐾 Pet *${pet ? `${pet.icon} ${pet.name}` : "Belum ada"}*`,
		...sectionTitle("🎯", "Prioritas Berikutnya"),
		...tasks,
		...sectionTitle("🔁", "Loop Cepat"),
		itemBullet(
			`${prefix}daily -> ${getDailyStatusText(displayPlayer)}`,
			"•"
		),
		itemBullet(`${prefix}misi -> cek reward siap claim`, "•"),
		itemBullet(`${prefix}tavern -> cek task harian/mingguan`, "•"),
		itemBullet(
			`${prefix}jelajah / ${prefix}kerja mine -> cari XP, gold, material`,
			"•"
		),
		itemBullet(
			`${prefix}upgrade -> ubah material jadi power permanen`,
			"•"
		),
		"",
		commandHint("Progress lengkap", `${prefix}progress`),
		commandHint("Profil", `${prefix}profil`),
	].join("\n");
}

function formatComebackRewardText(comeback) {
	const rows = [
		comeback?.gold ? `💰 +${formatNumber(comeback.gold)} gold` : "",
		comeback?.xp ? `⭐ +${comeback.xp} XP` : "",
		...Object.entries(comeback?.items || {}).map(
			([itemKey, amount]) => `📦 ${getItemName(itemKey)} x${amount}`
		),
	].filter(Boolean);

	return rows.join(", ") || "-";
}

function formatComebackBonusRows(comeback) {
	if (!comeback) {
		return [];
	}

	return [
		"",
		"🧭 *Return Supply*",
		`Absen *${formatNumber(comeback.inactiveDays)} hari*; bonus balik aktif.`,
		`Bonus: ${formatComebackRewardText(comeback)}`,
	];
}

export function formatComebackStatus(player, prefix = ".") {
	const displayPlayer = getGuidePlayer(player);
	const now = Date.now();
	const comeback = getComebackDailyBonus(displayPlayer, now);
	const dailyReady = isDailyReady(displayPlayer);
	const dailyText = dailyReady
		? "Daily siap diklaim sekarang."
		: `Daily reset dalam ${formatDuration(DAY_MS - (now - displayPlayer.lastDaily))}.`;
	const comebackText = comeback
		? `Return Supply siap saat kamu menjalankan ${prefix}daily.`
		: "Return Supply aktif otomatis kalau kamu absen 3 hari atau lebih.";
	const lastDailyText = `Daily terakhir: *${formatInactiveTime(displayPlayer.lastDaily, now)}*.`;

	return [
		...chatHeader(
			"🧭",
			`Comeback ${displayPlayer.name}`,
			"Jalur cepat untuk balik aktif"
		),
		lastDailyText,
		`🎁 ${dailyText}`,
		`📦 ${comebackText}`,
		...(comeback
			? [
					"",
					"🎒 *Supply Siap*",
					`Bonus: ${formatComebackRewardText(comeback)}`,
				]
			: []),
		...sectionTitle("🔁", "Mulai dari sini"),
		itemBullet(
			`${prefix}daily -> ambil reward, isi HP, dan isi energi`,
			"•"
		),
		itemBullet(
			`${prefix}tavern claim -> ambil task yang sudah selesai`,
			"•"
		),
		itemBullet(
			`${prefix}rpg -> buka hub untuk lanjut quest, boss, atau farm`,
			"•"
		),
		"",
		commandHint("Ambil daily", `${prefix}daily`),
		commandHint("Buka hub", `${prefix}rpg`),
	].join("\n");
}

export function formatPlayerProgress(player, prefix = ".") {
	const displayPlayer = getGuidePlayer(player);
	const quests = getBeginnerQuestSummary(displayPlayer);
	const skills = normalizeSkills(displayPlayer.skills, displayPlayer.level);
	const ownedSkillCount = getOwnedSkillKeys({
		...displayPlayer,
		skills,
	}).length;
	const pets = normalizePets(displayPlayer.pets);
	const achievementSummary = getAchievementSummary(displayPlayer);
	const gearTotal = Object.keys(GEAR_UPGRADE_RULES).reduce(
		(total, slot) => total + getGearUpgradeLevel(displayPlayer, slot),
		0
	);
	const gearMax = GEAR_UPGRADE_MAX * Object.keys(GEAR_UPGRADE_RULES).length;
	const skillSlotLimit = getSkillSlotLimit(displayPlayer);
	const dailyText = isDailyReady(displayPlayer)
		? `siap, pakai ${prefix}daily`
		: getDailyStatusText(displayPlayer);
	const dailyStreak = normalizeDailyStreak(displayPlayer.dailyStreak);
	const guildDone = getGuildMembershipCount(displayPlayer) > 0;
	const squadDone = Boolean(displayPlayer.squad?.name);
	const petDone = Object.keys(pets.owned).length > 0;
	const skillDone = ownedSkillCount > 0 && skills.equipped.length > 0;
	const gearDone = gearTotal > 0;

	return [
		...chatHeader(
			"📈",
			`Progress Aetheria ${displayPlayer.name}`,
			"Checklist agar karakter terasa makin kuat"
		),
		progressCheck(!isDailyReady(displayPlayer), "Daily", dailyText),
		progressCheck(
			quests.done >= quests.total,
			"Quest Pemula",
			`${quests.done}/${quests.total} selesai`
		),
		progressCheck(
			dailyStreak.count >= 3,
			"Daily Streak",
			`${dailyStreak.count}/3 hari target awal`
		),
		progressCheck(
			displayPlayer.level >= 5,
			"Level Awal",
			`Lv ${displayPlayer.level}/5 target awal`
		),
		progressCheck(
			gearDone,
			"Gear Upgrade",
			`+${gearTotal}/${gearMax} total upgrade`
		),
		progressCheck(
			skillDone,
			"Skill Build",
			`${ownedSkillCount} skill dimiliki, ${skills.equipped.length}/${skillSlotLimit} dipasang`
		),
		progressCheck(
			petDone,
			"Companion",
			`${Object.keys(pets.owned).length}/${Object.keys(PETS).length} pet dimiliki`
		),
		progressCheck(
			guildDone,
			"Guild",
			guildDone ? "sudah terdaftar" : "belum pilih guild"
		),
		progressCheck(
			squadDone,
			"Squad",
			squadDone
				? `${displayPlayer.squad.name} (${displayPlayer.squad.memberCount}/${displayPlayer.squad.maxMembers})`
				: "belum punya squad"
		),
		progressCheck(
			achievementSummary.unlocked > 0,
			"Achievement",
			`${achievementSummary.unlocked}/${achievementSummary.total} unlocked`
		),
		...sectionTitle("🧩", "Command Lanjutan"),
		commandHint("Arah berikutnya", `${prefix}guide`),
		commandHint("Quest", `${prefix}misi`),
		commandHint("Upgrade", `${prefix}upgrade`),
		commandHint("Pet", `${prefix}pet`),
	].join("\n");
}

function formatAchievementLine(achievement) {
	const status = achievement.unlocked
		? "✅ Unlocked"
		: `${achievement.progress}/${achievement.target}`;
	const titleText = achievement.titleReward
		? ` | Title: ${achievement.titleReward.name}`
		: "";

	return [
		`• *${achievement.key}* - ${achievement.name}`,
		`  ${achievement.description}`,
		`  Progress: *${status}*${titleText}`,
	].join("\n");
}

export function formatAchievementBoard(result, prefix = ".") {
	const achievements = result.achievements || [];
	const unlocked = achievements.filter((achievement) => achievement.unlocked);
	const locked = achievements.filter((achievement) => !achievement.unlocked);
	const rows = [
		...chatHeader(
			"🏅",
			"Achievement Aetheria",
			`${unlocked.length}/${achievements.length} unlocked`
		),
	];

	if (result.newlyUnlocked?.length) {
		rows.push(...sectionTitle("✨", "Baru Unlock"));
		rows.push(
			...result.newlyUnlocked.map(
				(achievement) =>
					`• *${achievement.name}*${achievement.titleReward ? ` | Title: ${achievement.titleReward.name}` : ""}`
			)
		);
	}

	if (unlocked.length) {
		rows.push(...sectionTitle("✅", "Unlocked"));
		rows.push(...unlocked.map(formatAchievementLine));
	}

	if (locked.length) {
		rows.push(...sectionTitle("🔒", "Progress"));
		rows.push(...locked.map(formatAchievementLine));
	}

	rows.push(
		"",
		commandHint("Cek title", `${prefix}title`),
		commandHint("Pakai title", `${prefix}title pakai <title>`)
	);

	return rows.join("\n");
}

export function formatTitleBoard(result, prefix = ".") {
	const titles = result.titles || [];
	const owned = titles.filter((title) => title.owned);
	const locked = titles.filter((title) => !title.owned);
	const rows = [
		...chatHeader(
			"🏷️",
			"Title Aetheria",
			`Aktif: ${result.currentTitle || "-"}`
		),
		`Race title: *${result.raceTitle || "-"}*`,
	];

	if (owned.length) {
		rows.push(...sectionTitle("✅", "Dimiliki"));
		rows.push(
			...owned.map(
				(title) =>
					`• ${title.equipped ? "⭐" : "▫️"} *${title.key}* - ${title.name}`
			)
		);
	}

	if (locked.length) {
		rows.push(...sectionTitle("🔒", "Belum Unlock"));
		rows.push(
			...locked.map((title) => `• *${title.key}* - ${title.description}`)
		);
	}

	rows.push(
		"",
		commandHint("Pakai title", `${prefix}title pakai <title>`),
		commandHint("Reset ke race", `${prefix}title reset`)
	);

	return rows.join("\n");
}

export function formatTitleEquipResult(result, prefix = ".") {
	if (result.status === "invalid_title") {
		return [
			...chatHeader("🏷️", "Title Tidak Dikenal"),
			`Cek title yang tersedia: \`${prefix}title\``,
		].join("\n");
	}

	if (result.status === "locked") {
		return [
			...chatHeader("🔒", "Title Belum Terbuka"),
			`Title: *${result.title?.name || result.titleKey}*`,
			`Cek progress: \`${prefix}achievement\``,
		].join("\n");
	}

	if (result.status === "reset") {
		return [
			...chatHeader("🏷️", "Title Direset"),
			`Title aktif kembali ke race title: *${result.currentTitle}*`,
			commandHint("Cek profil", `${prefix}profil`),
		].join("\n");
	}

	return [
		...chatHeader("🏷️", "Title Dipakai"),
		`Title aktif: *${result.currentTitle}*`,
		commandHint("Cek profil", `${prefix}profil`),
	].join("\n");
}

function formatPetLine(pet) {
	const status = pet.owned
		? pet.equipped
			? "⭐ Aktif"
			: "✅ Dimiliki"
		: "🔒 Belum punya";
	const shardText = pet.owned
		? ` | Shard ${pet.shards}/${PET_SHARDS_PER_LEVEL}`
		: "";

	return [
		`• ${pet.icon} *${pet.key}* - ${pet.name}`,
		`  ${status} | Lv ${pet.level}/${PET_MAX_LEVEL}${shardText}`,
		`  Bonus: ${formatPetBonuses(pet.bonuses)}`,
	].join("\n");
}

function formatPetSummonCost(result) {
	if (result.cost?.free) {
		return "Gratis untuk companion pertama.";
	}

	return `Biaya summon: ${formatNumber(PET_SUMMON_COST.gold)} gold, ${formatRequirements(PET_SUMMON_COST.items)}.`;
}

export function formatPetStatus(result, prefix = ".") {
	const rows = [
		...chatHeader(
			"🐾",
			"Companion Aetheria",
			`${result.summary?.owned || 0}/${result.summary?.total || Object.keys(PETS).length} pet dimiliki`
		),
	];
	const equipped = result.equippedPet;

	if (equipped) {
		rows.push(
			`⭐ Aktif: ${equipped.icon} *${equipped.name}* Lv ${equipped.level}`,
			`Bonus: ${formatPetBonuses(equipped.bonuses)}`
		);
	} else {
		rows.push("⭐ Aktif: *Belum ada*");
	}

	rows.push(...sectionTitle("🐾", "Koleksi"));
	rows.push(...(result.pets || []).map(formatPetLine));
	rows.push(
		"",
		formatPetSummonCost(result),
		commandHint("Summon", `${prefix}pet summon`),
		commandHint("Pakai", `${prefix}pet pakai <pet>`),
		commandHint("Lepas", `${prefix}pet lepas`)
	);

	return rows.join("\n");
}

export function formatPetSummonResult(result, prefix = ".") {
	if (result.status === "missing_cost") {
		return [
			...chatHeader("🐾", "Summon Belum Bisa"),
			`Kurang: *${result.missing.join(", ")}*`,
			formatPetSummonCost(result),
			`Dapat Pet Essence dari World Boss: \`${prefix}boss\``,
		].join("\n");
	}

	const pet = result.result.pet;
	const duplicateText =
		result.result.status === "duplicate"
			? result.result.levels.length
				? `Duplikat jadi shard. Level naik ke *${result.result.levels.at(-1)}*.`
				: `Duplikat jadi shard: *${result.result.shards}/${PET_SHARDS_PER_LEVEL}*.`
			: "Companion baru masuk koleksi.";

	return [
		...chatHeader(
			pet.icon,
			result.result.status === "duplicate" ? "Pet Duplikat" : "Pet Baru",
			`${pet.name} Lv ${result.result.level}`
		),
		duplicateText,
		`Bonus: ${formatPetBonuses(getPetBonuses(result.result.key, result.result.level))}`,
		"",
		commandHint("Cek pet", `${prefix}pet`),
		commandHint("Pakai pet", `${prefix}pet pakai ${result.result.key}`),
	].join("\n");
}

export function formatPetEquipResult(result, prefix = ".") {
	if (result.status === "invalid_pet") {
		return [
			...chatHeader("🐾", "Pet Tidak Dikenal"),
			`Cek koleksi: \`${prefix}pet\``,
		].join("\n");
	}

	if (result.status === "locked") {
		return [
			...chatHeader("🔒", "Pet Belum Dimiliki"),
			`Pet: *${result.pet?.name || result.petKey}*`,
			`Summon dulu: \`${prefix}pet summon\``,
		].join("\n");
	}

	if (result.status === "reset") {
		return [
			...chatHeader("🐾", "Pet Dilepas"),
			"Profil kembali tanpa companion aktif.",
			commandHint("Cek profil", `${prefix}profil`),
		].join("\n");
	}

	return [
		...chatHeader(
			result.pet.icon,
			"Pet Dipakai",
			`${result.pet.name} Lv ${result.pet.level}`
		),
		`Bonus: ${formatPetBonuses(result.pet.bonuses)}`,
		commandHint("Cek profil", `${prefix}profil`),
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

export async function getGearUpgradeStatus(userId, name) {
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

export async function upgradeGearSlot(userId, name, slotInput) {
	const slot = normalizeGearSlot(slotInput);

	if (!slot) {
		return {
			status: "invalid_slot",
		};
	}

	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const player = loaded.player;
	const rule = GEAR_UPGRADE_RULES[slot];
	const gearKey = player.gear?.[slot];
	const gear = SHOP_ITEMS[gearKey];

	if (!gear || gear.type !== "gear") {
		if (loaded.regened) {
			await savePlayer(userId, loaded.user, player, name);
		}

		return {
			status: "empty_slot",
			player,
			rule,
			slot,
		};
	}

	const oldLevel = getGearUpgradeLevel(player, slot);

	if (oldLevel >= GEAR_UPGRADE_MAX) {
		if (loaded.regened) {
			await savePlayer(userId, loaded.user, player, name);
		}

		return {
			status: "max_level",
			player,
			rule,
			slot,
		};
	}

	const cost = getGearUpgradeCost(slot, oldLevel);
	const missing = [];

	if (player.gold < cost.gold) {
		missing.push({
			icon: "💰",
			name: "Gold",
			owned: player.gold,
			amount: cost.gold,
		});
	}

	for (const [itemKey, amount] of Object.entries(cost.items || {})) {
		const owned = toInt(player.items[itemKey], 0);

		if (owned < amount) {
			missing.push({
				icon: "📦",
				name: getItemName(itemKey),
				owned,
				amount,
			});
		}
	}

	if (missing.length) {
		if (loaded.regened) {
			await savePlayer(userId, loaded.user, player, name);
		}

		return {
			status: "not_enough_resource",
			player,
			rule,
			slot,
			cost,
			missing,
		};
	}

	const beforeStats = getStats(player);
	player.gold -= cost.gold;

	for (const [itemKey, amount] of Object.entries(cost.items || {})) {
		addItem(player, itemKey, -amount);
	}

	player.gearUpgrades = normalizeGearUpgrades(player.gearUpgrades);
	player.gearUpgrades[slot] = oldLevel + 1;
	addActivity(player, "upgrades");

	const afterStats = getStats(player);
	player.hp = clamp(
		player.hp + Math.max(0, afterStats.maxHp - beforeStats.maxHp),
		0,
		afterStats.maxHp
	);

	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		rule,
		slot,
		gearName: gear.name,
		oldLevel,
		newLevel: oldLevel + 1,
		cost,
	};
}

export async function getAchievementStatus(userId, name) {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const unlocked = unlockAchievements(loaded.player);
	const player =
		unlocked.length || loaded.regened
			? await savePlayer(userId, loaded.user, loaded.player, name)
			: loaded.player;

	return {
		status: "ok",
		player,
		achievements: getAchievementRows(player),
		newlyUnlocked: unlocked,
	};
}

export async function getTitleStatus(userId, name) {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const unlocked = unlockAchievements(loaded.player);
	const player =
		unlocked.length || loaded.regened
			? await savePlayer(userId, loaded.user, loaded.player, name)
			: loaded.player;

	return {
		status: "ok",
		player,
		currentTitle: getPlayerTitle(player),
		raceTitle: getRace(player).title,
		titles: getTitleRows(player),
		newlyUnlocked: unlocked,
	};
}

export async function equipTitle(userId, name, titleInput) {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const player = loaded.player;
	unlockAchievements(player);
	player.titles = normalizeTitles(player.titles);

	const input = normalizeInput(titleInput);

	if (["reset", "race", "default", "bawaan", "hapus"].includes(input)) {
		player.titles.equipped = null;
		const saved = await savePlayer(userId, loaded.user, player, name);

		return {
			status: "reset",
			player: saved,
			currentTitle: getPlayerTitle(saved),
			raceTitle: getRace(saved).title,
			titles: getTitleRows(saved),
		};
	}

	const titleKey = normalizeTitleKey(titleInput);

	if (!titleKey || !TITLES[titleKey]) {
		return {
			status: "invalid_title",
			player,
			titleKey,
			titles: getTitleRows(player),
		};
	}

	if (!player.titles.owned[titleKey]) {
		return {
			status: "locked",
			player,
			titleKey,
			title: TITLES[titleKey],
			titles: getTitleRows(player),
		};
	}

	player.titles.equipped = titleKey;
	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		currentTitle: getPlayerTitle(saved),
		raceTitle: getRace(saved).title,
		titleKey,
		title: TITLES[titleKey],
		titles: getTitleRows(saved),
	};
}

export async function getPetStatus(userId, name) {
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
		pets: getPetRows(player),
		summary: getPetSummary(player),
		equippedPet: getEquippedPet(player),
		cost: PET_SUMMON_COST,
	};
}

export async function summonPet(userId, name) {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const player = loaded.player;
	player.pets = normalizePets(player.pets);

	const firstSummon = !Object.keys(player.pets.owned).length;
	const cost = {
		free: firstSummon,
		...PET_SUMMON_COST,
	};

	if (!firstSummon) {
		const paid = consumePetSummonCost(player);

		if (paid.status !== "ok") {
			if (loaded.regened) {
				await savePlayer(userId, loaded.user, player, name);
			}

			return {
				status: "missing_cost",
				player,
				missing: paid.missing,
				cost,
			};
		}
	}

	const petKey = pick(Object.keys(PETS));
	const result = grantPet(player, petKey);
	addActivity(player, "petSummons");

	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		result,
		pets: getPetRows(saved),
		equippedPet: getEquippedPet(saved),
		cost,
	};
}

export async function equipPet(userId, name, petInput) {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const player = loaded.player;
	player.pets = normalizePets(player.pets);
	const input = normalizeInput(petInput);

	if (["reset", "lepas", "none", "hapus"].includes(input)) {
		player.pets.equipped = null;
		const saved = await savePlayer(userId, loaded.user, player, name);

		return {
			status: "reset",
			player: saved,
			pets: getPetRows(saved),
			equippedPet: null,
		};
	}

	const petKey = normalizePetKey(petInput);

	if (!petKey || !PETS[petKey]) {
		return {
			status: "invalid_pet",
			player,
			petKey,
			pets: getPetRows(player),
		};
	}

	if (!player.pets.owned[petKey]) {
		return {
			status: "locked",
			player,
			petKey,
			pet: PETS[petKey],
			pets: getPetRows(player),
		};
	}

	player.pets.equipped = petKey;
	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		petKey,
		pet: getEquippedPet(saved),
		pets: getPetRows(saved),
		equippedPet: getEquippedPet(saved),
	};
}

export async function getWorldBossStatus(groupId) {
	const { group, state } = await loadWorldBossState(groupId);
	const now = Date.now();
	const status = getOrSpawnWorldBoss(state, now);
	const saved = await saveWorldBossState(groupId, group, state);

	return {
		status: status.status === "spawned" ? "active" : status.status,
		boss: saved.current,
		remaining:
			status.status === "cooldown"
				? status.remaining
				: Math.max(0, saved.current?.expiresAt - now),
		topDamage: getWorldBossTopDamage(saved.current),
	};
}

export async function attackWorldBoss(groupId, userId, name) {
	const { group, state } = await loadWorldBossState(groupId);
	const now = Date.now();
	const status = getOrSpawnWorldBoss(state, now);

	if (status.status === "cooldown") {
		return {
			status: "cooldown",
			boss: status.boss,
			remaining: status.remaining,
			topDamage: getWorldBossTopDamage(status.boss),
		};
	}

	let boss = state.current;
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
			boss,
		};
	}

	const player = loaded.player;
	const stats = getStats(player);

	if (player.hp <= 1) {
		if (loaded.regened) {
			await savePlayer(userId, loaded.user, player, name);
		}

		return {
			status: "low_hp",
			player,
			boss,
		};
	}

	if (player.energy < WORLD_BOSS_ENERGY_COST) {
		if (loaded.regened) {
			await savePlayer(userId, loaded.user, player, name);
		}

		return {
			status: "no_energy",
			player,
			boss,
			needed: WORLD_BOSS_ENERGY_COST,
		};
	}

	const participants = boss.participants || {};
	const currentParticipant = participants[userId] || {
		userId,
		name: cleanName(name),
		damage: 0,
		attacks: 0,
		lastAttackAt: 0,
	};
	const cooldownRemaining =
		currentParticipant.lastAttackAt + WORLD_BOSS_ATTACK_COOLDOWN_MS - now;

	if (cooldownRemaining > 0) {
		return {
			status: "attack_cooldown",
			player,
			boss,
			remaining: cooldownRemaining,
		};
	}

	const damage = Math.min(calculateWorldBossDamage(player, boss), boss.hp);
	const counterDamage = calculateWorldBossCounterDamage(player, boss);

	player.energy -= WORLD_BOSS_ENERGY_COST;
	player.hp = clamp(player.hp - counterDamage, 1, stats.maxHp);
	addActivity(player, "bossAttacks");

	boss.hp = clamp(boss.hp - damage, 0, boss.maxHp);
	boss.participants = {
		...participants,
		[userId]: {
			...currentParticipant,
			name: cleanName(name),
			damage: currentParticipant.damage + damage,
			attacks: currentParticipant.attacks + 1,
			lastAttackAt: now,
		},
	};

	const attack = {
		damage,
		counterDamage,
		energyCost: WORLD_BOSS_ENERGY_COST,
	};

	if (boss.hp > 0) {
		const savedPlayer = await savePlayer(userId, loaded.user, player, name);
		const savedState = await saveWorldBossState(groupId, group, state);
		boss = savedState.current;

		return {
			status: "ok",
			player: savedPlayer,
			boss,
			attack,
			topDamage: getWorldBossTopDamage(boss),
			remaining: Math.max(0, boss.expiresAt - now),
		};
	}

	boss.status = "defeated";
	boss.defeatedAt = now;
	boss.nextSpawnAt = now + WORLD_BOSS_RESPAWN_MS;
	boss.killer = {
		userId,
		name: cleanName(name),
	};

	const savedState = await saveWorldBossState(groupId, group, state);
	boss = savedState.current;

	const participantsByDamage = getWorldBossTopDamage(boss, 50);
	const totalDamage = participantsByDamage.reduce(
		(sum, participant) => sum + participant.damage,
		0
	);
	const rewards = [];
	let savedAttacker = null;

	for (const [index, participant] of participantsByDamage.entries()) {
		const isAttacker = participant.userId === userId;
		const participantLoaded = isAttacker
			? {
					user: loaded.user,
					player,
				}
			: await loadPlayer(participant.userId, participant.name);

		if (!participantLoaded.player) {
			continue;
		}

		const isKiller = participant.userId === userId;
		const reward = applyWorldBossReward(
			participantLoaded.player,
			getWorldBossReward(
				boss,
				participant,
				index + 1,
				totalDamage,
				isKiller
			),
			participant,
			isKiller
		);
		const savedPlayer = await savePlayer(
			participant.userId,
			participantLoaded.user,
			participantLoaded.player,
			participant.name
		);

		if (isAttacker) {
			savedAttacker = savedPlayer;
		}

		rewards.push({
			participant,
			reward,
			rank: index + 1,
			killer: isKiller,
		});
	}

	return {
		status: "defeated",
		player: savedAttacker || player,
		boss,
		attack,
		rewards,
		topDamage: getWorldBossTopDamage(boss),
		remaining: WORLD_BOSS_RESPAWN_MS,
	};
}

export async function runSquadDungeon(userId, name) {
	const squad = await getSquadByWhatsApp(userId);

	if (squad.status === "missing") {
		return {
			status: "missing_squad",
		};
	}

	if (squad.status !== "ok") {
		return {
			status: "squad_error",
			error: squad.error,
			squad,
		};
	}

	const now = Date.now();
	const loadedMembers = await Promise.all(
		(squad.members || []).map(async (member) => {
			const displayName = member.display_name || name;
			const loaded = await loadPlayer(member.whatsapp_jid, displayName);

			if (!loaded.player) {
				return {
					member,
					status: "missing_character",
					name: displayName,
				};
			}

			const player = loaded.player;
			const cooldownRemaining =
				player.lastDungeon + DUNGEON_COOLDOWN_MS - now;
			let status = "ready";
			let remaining = 0;

			if (player.hp <= 1) {
				status = "low_hp";
			} else if (player.energy < DUNGEON_ENERGY_COST) {
				status = "no_energy";
			} else if (cooldownRemaining > 0) {
				status = "cooldown";
				remaining = cooldownRemaining;
			}

			if (loaded.regened && status !== "ready") {
				await savePlayer(
					member.whatsapp_jid,
					loaded.user,
					player,
					displayName
				);
			}

			return {
				member,
				loaded,
				player,
				status,
				name: displayName,
				remaining,
			};
		})
	);
	const caller = loadedMembers.find(
		(entry) => entry.member?.whatsapp_jid === userId
	);

	if (!caller?.player) {
		return {
			status: "missing",
			squad,
		};
	}

	const readyMembers = loadedMembers.filter(
		(entry) => entry.status === "ready"
	);

	if (!readyMembers.length) {
		return {
			status: "no_ready_members",
			squad,
			members: loadedMembers,
			energyCost: DUNGEON_ENERGY_COST,
			cooldown: DUNGEON_COOLDOWN_MS,
		};
	}

	const averageLevel = Math.max(
		1,
		Math.round(
			readyMembers.reduce((sum, member) => sum + member.player.level, 0) /
				readyMembers.length
		)
	);
	const dungeon = getDungeonForLevel(averageLevel);
	const simulation = simulateDungeon(dungeon, readyMembers);
	const rewards = [];

	for (const entry of readyMembers) {
		const player = entry.player;
		const stats = getStats(player);

		player.energy = clamp(
			player.energy - DUNGEON_ENERGY_COST,
			0,
			player.maxEnergy
		);
		player.hp = clamp(player.hp - simulation.totalDamage, 1, stats.maxHp);
		player.lastDungeon = now;

		const reward = applyDungeonReward(player, dungeon, simulation);
		const saved = await savePlayer(
			entry.member.whatsapp_jid,
			entry.loaded.user,
			player,
			entry.name
		);

		rewards.push({
			member: entry.member,
			name: entry.name,
			player: saved,
			reward,
		});
	}

	return {
		status: simulation.fullClear ? "cleared" : "failed",
		squad,
		dungeon,
		simulation,
		rewards,
		members: loadedMembers,
		energyCost: DUNGEON_ENERGY_COST,
		cooldown: DUNGEON_COOLDOWN_MS,
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

export async function getBestiaryStatus(userId, name, zoneInput = "") {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const player = loaded.player;
	const activeZone = getActiveZone(player);
	const activeZoneKey = getZoneKey(activeZone);
	const input = normalizeInput(zoneInput);

	if (["all", "semua", "allzone", "semuazona"].includes(input)) {
		return {
			status: "ok",
			player,
			activeZoneKey,
			zones: ZONES.filter((zone) => player.level >= zone.minLevel),
		};
	}

	const zoneKey = normalizeZoneKey(input) || activeZoneKey;
	const zone = getZoneByKey(zoneKey);

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

	return {
		status: "ok",
		player,
		activeZoneKey,
		zones: [zone],
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
		addActivity(player, "wins");

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
	addActivity(player, "jobs");
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
	const nextStreak = getNextDailyStreak(player, now);
	const streakBonus = getDailyStreakBonus(nextStreak.count);
	const comebackBonus = getComebackDailyBonus(player, now);
	const rewards = {
		gold: 150 + player.level * 25 + streakBonus.gold,
		xp: 48 + player.level * 9 + streakBonus.xp,
		potion: 1,
		comeback: comebackBonus,
		streak: nextStreak,
		streakBonus,
		levels: [],
	};

	if (comebackBonus) {
		rewards.gold += comebackBonus.gold;
		rewards.xp += comebackBonus.xp;
	}

	player.gold += rewards.gold;
	player.energy = player.maxEnergy;
	player.hp = stats.maxHp;
	player.lastDaily = now;
	player.dailyStreak = nextStreak;
	addItem(player, "potion", rewards.potion);
	for (const [itemKey, amount] of Object.entries(streakBonus.items)) {
		addItem(player, itemKey, amount);
	}
	for (const [itemKey, amount] of Object.entries(
		comebackBonus?.items || {}
	)) {
		addItem(player, itemKey, amount);
	}
	addActivity(player, "dailies");
	rewards.levels = addXp(player, rewards.xp);

	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		rewards,
	};
}

export async function getQuestStatus(userId, name, typeInput = "all") {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const now = Date.now();
	const player = loaded.player;

	const guildStatus = await getGuildStatusByWhatsApp(userId);
	const memberships =
		guildStatus.status === "ok" ? guildStatus.memberships || {} : {};
	const context = { memberships };
	normalizeQuestBook(player, now, context);
	const quests = getQuestDefinitions(typeInput)
		.filter((quest) => !quest.guild || memberships[quest.guild])
		.map((quest) => getQuestProgress(player, quest, now, context));

	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		quests,
		guildStatus,
	};
}

export async function claimQuestReward(userId, name, questInput = "ready") {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const now = Date.now();
	const player = loaded.player;
	const query = normalizeInput(questInput || "ready");

	const guildStatus = await getGuildStatusByWhatsApp(userId);
	const memberships =
		guildStatus.status === "ok" ? guildStatus.memberships || {} : {};
	const context = { memberships };
	normalizeQuestBook(player, now, context);
	const definitions = Object.values(QUEST_DEFINITIONS).filter(
		(quest) => !quest.guild || memberships[quest.guild]
	);
	const claimable = definitions
		.map((quest) => getQuestProgress(player, quest, now, context))
		.filter((quest) => {
			if (!quest.ready) {
				return false;
			}

			return (
				query === "ready" ||
				query === "all" ||
				query === "semua" ||
				query === normalizeInput(quest.key) ||
				query === normalizeInput(quest.name) ||
				query === quest.type
			);
		});

	if (!claimable.length) {
		return {
			status: "nothing_ready",
			player,
			quests: definitions.map((quest) =>
				getQuestProgress(player, quest, now, context)
			),
		};
	}

	const claimed = [];

	for (const quest of claimable) {
		const rewards = applyQuestRewards(player, quest);
		player.quests[quest.key] = {
			...quest.state,
			claimed: true,
		};

		let guildPoints = null;
		if (quest.guild && quest.points) {
			guildPoints = await addGuildPoints(
				userId,
				quest.guild,
				quest.points
			);
		}

		claimed.push({
			quest,
			rewards,
			guildPoints,
		});
	}

	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		claimed,
	};
}

export async function getTavernBoard(userId, name, typeInput = "all") {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const now = Date.now();
	const player = loaded.player;
	normalizeTavernBoard(player, now);
	const tasks = getTavernDefinitions(typeInput).map((task) =>
		getTavernTaskProgress(player, task, now)
	);
	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		tasks,
	};
}

export async function claimTavernRewards(userId, name, taskInput = "ready") {
	const loaded = await loadPlayer(userId, name);

	if (!loaded.player) {
		return {
			status: "missing",
		};
	}

	const now = Date.now();
	const player = loaded.player;
	const query = normalizeInput(taskInput || "ready");

	normalizeTavernBoard(player, now);

	const definitions = Object.values(TAVERN_TASKS);
	const claimable = definitions
		.map((task) => getTavernTaskProgress(player, task, now))
		.filter((task) => {
			if (!task.ready) {
				return false;
			}

			return (
				query === "ready" ||
				query === "all" ||
				query === "semua" ||
				query === normalizeInput(task.key) ||
				query === normalizeInput(task.name) ||
				query === task.type
			);
		});

	if (!claimable.length) {
		return {
			status: "nothing_ready",
			player,
			tasks: definitions.map((task) =>
				getTavernTaskProgress(player, task, now)
			),
		};
	}

	const claimed = [];

	for (const task of claimable) {
		const rewards = applyTavernRewards(player, task);
		player.tavern.tasks[task.key] = {
			...task.state,
			claimed: true,
		};

		claimed.push({
			task,
			rewards,
		});
	}

	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		player: saved,
		claimed,
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
	addActivity(player, "buys");

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
	addActivity(player, "crafts");

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
		addActivity(
			player,
			"sells",
			sold.reduce((sum, item) => sum + item.quantity, 0)
		);
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
	addActivity(player, "sells", quantity);

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
	const item = SHOP_ITEMS[itemKey];

	if (item?.type !== "consumable") {
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
			item,
			player,
		};
	}

	const restoresHp = toInt(item.restoreHp, 0) > 0;
	const restoresEnergy = toInt(item.restoreEnergy, 0) > 0;
	const hpFull = !restoresHp || player.hp >= stats.maxHp;
	const energyFull = !restoresEnergy || player.energy >= player.maxEnergy;

	if (hpFull && energyFull) {
		return {
			status: "full",
			item,
			player,
		};
	}

	addItem(player, itemKey, -1);
	player.hp = clamp(player.hp + toInt(item.restoreHp, 0), 0, stats.maxHp);
	player.energy = clamp(
		player.energy + toInt(item.restoreEnergy, 0),
		0,
		player.maxEnergy
	);
	addActivity(player, "heals");

	const saved = await savePlayer(userId, loaded.user, player, name);

	return {
		status: "ok",
		item,
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
	const streak = normalizeDailyStreak(
		result.rewards.streak || {
			count: 1,
			best: 1,
		}
	);
	const bonus = result.rewards.streakBonus || {};
	const bonusItems = Object.entries(bonus.items || {})
		.map(([itemKey, amount]) => `${getItemName(itemKey)} x${amount}`)
		.join(", ");
	const bonusRows = [
		bonus.gold ? `💰 +${formatNumber(bonus.gold)} gold` : "",
		bonus.xp ? `⭐ +${bonus.xp} XP` : "",
		bonusItems ? `📦 ${bonusItems}` : "",
	].filter(Boolean);
	const streakRows = [
		"",
		"🔥 *Daily Streak*",
		`Hari ke-*${streak.count}* | Best *${streak.best}*`,
		bonusRows.length
			? `Bonus: ${bonusRows.join(", ")}`
			: "Bonus: mulai dari hari ke-2.",
	];
	const comebackRows = formatComebackBonusRows(result.rewards.comeback);

	return [
		...chatHeader("🎁", "Daily Reward", "Hadiah harian berhasil diambil"),
		`💰 Gold: *${formatNumber(result.rewards.gold)}*`,
		`⭐ XP: *${result.rewards.xp}*`,
		`🧪 Potion: *${result.rewards.potion}*${levelText}`,
		...streakRows,
		...comebackRows,
		"",
		"❤️ HP dan ⚡ energi penuh.",
	].join("\n");
}

function formatRewardText(rewards = {}) {
	const rows = [];

	if (rewards.gold) {
		rows.push(`💰 ${formatNumber(rewards.gold)} gold`);
	}

	if (rewards.xp) {
		rows.push(`⭐ ${rewards.xp} XP`);
	}

	for (const [itemKey, amount] of Object.entries(rewards.items || {})) {
		rows.push(`📦 ${getItemName(itemKey)} x${amount}`);
	}

	return rows.join(", ") || "-";
}

function formatQuestLine(quest) {
	const status = quest.claimed
		? "✅ Claimed"
		: quest.ready
			? "🎁 Siap claim"
			: `${quest.progress}/${quest.target}`;
	const guildText = quest.guild ? " | Guild" : "";

	return [
		`• *${quest.key}* - ${quest.name}${guildText}`,
		`  ${quest.description}`,
		`  Progress: *${status}*`,
		`  Reward: ${formatRewardText(quest.rewards)}${quest.points ? `, 🏛️ ${quest.points} GP` : ""}`,
	].join("\n");
}

export function formatQuestBoard(result, prefix = ".") {
	const quests = result.quests || [];

	if (!quests.length) {
		return [
			...chatHeader("📜", "Misi Aetheria", "Belum ada misi tersedia"),
			`Daftar guild untuk misi guild: \`${prefix}guild\``,
		].join("\n");
	}

	const beginner = quests.filter((quest) => quest.type === "beginner");
	const daily = quests.filter((quest) => quest.type === "daily");
	const weekly = quests.filter((quest) => quest.type === "weekly");
	const guild = quests.filter((quest) => quest.type === "guild");
	const rows = [
		...chatHeader(
			"📜",
			"Misi Aetheria",
			"Pemula, harian, mingguan, dan guild"
		),
	];

	if (beginner.length) {
		rows.push(...sectionTitle("🌱", "Pemula"));
		rows.push(...beginner.map(formatQuestLine));
	}

	if (daily.length) {
		rows.push(...sectionTitle("☀️", "Harian"));
		rows.push(...daily.map(formatQuestLine));
	}

	if (weekly.length) {
		rows.push(...sectionTitle("🌙", "Mingguan"));
		rows.push(...weekly.map(formatQuestLine));
	}

	if (guild.length) {
		rows.push(...sectionTitle("🏛️", "Guild"));
		rows.push(...guild.map(formatQuestLine));
	}

	rows.push(
		"",
		commandHint("Claim siap", `${prefix}misi claim`),
		commandHint("Claim semua", `${prefix}misi claim semua`)
	);

	return rows.join("\n");
}

export function formatQuestClaimResult(result, prefix = ".") {
	const rows = [
		...chatHeader("🎁", "Misi Diklaim", "Reward berhasil diterima"),
	];

	for (const item of result.claimed || []) {
		const levelText = item.rewards.levels.length
			? ` | Lv up ${item.rewards.levels.join(", ")}`
			: "";
		const guildText =
			item.guildPoints?.status === "ok"
				? ` | GP +${item.guildPoints.points}`
				: "";

		rows.push(
			`• *${item.quest.name}*: ${formatRewardText(item.rewards)}${guildText}${levelText}`
		);
	}

	rows.push("", commandHint("Cek misi", `${prefix}misi`));

	return rows.join("\n");
}

function formatTavernTaskLine(task) {
	const status = task.claimed
		? "✅ Claimed"
		: task.ready
			? "🎁 Siap claim"
			: `${task.progress}/${task.target}`;

	return [
		`• *${task.name}*`,
		`  ${task.description}`,
		`  Progress: *${status}* | Reset: *${formatDuration(task.remainingMs)}*`,
		`  Reward: ${formatRewardText(task.rewards)}`,
	].join("\n");
}

export function formatTavernBoard(result, prefix = ".") {
	const tasks = result.tasks || [];

	if (!tasks.length) {
		return [
			...chatHeader("🍻", "Tavern Board", "Belum ada task aktif"),
			`Coba lagi: \`${prefix}tavern\``,
		].join("\n");
	}

	const daily = tasks.filter((task) => task.type === "daily");
	const weekly = tasks.filter((task) => task.type === "weekly");
	const readyCount = tasks.filter((task) => task.ready).length;
	const doneCount = tasks.filter((task) => task.done).length;
	const rows = [
		...chatHeader("🍻", "Tavern Board", "Task ringan harian dan mingguan"),
		`Ready *${readyCount}* | Selesai *${doneCount}/${tasks.length}*`,
	];

	if (daily.length) {
		rows.push(...sectionTitle("☀️", "Harian"));
		rows.push(...daily.map(formatTavernTaskLine));
	}

	if (weekly.length) {
		rows.push(...sectionTitle("🌙", "Mingguan"));
		rows.push(...weekly.map(formatTavernTaskLine));
	}

	rows.push(
		"",
		commandHint("Claim siap", `${prefix}tavern claim`),
		commandHint("Claim harian", `${prefix}tavern claim daily`),
		commandHint(
			"Loop cepat",
			`${prefix}daily | ${prefix}jelajah | ${prefix}kerja mine`
		)
	);

	return rows.join("\n");
}

export function formatTavernClaimResult(result, prefix = ".") {
	const rows = [
		...chatHeader("🍻", "Tavern Reward", "Reward board diterima"),
	];

	for (const item of result.claimed || []) {
		const levelText = item.rewards.levels.length
			? ` | Lv up ${item.rewards.levels.join(", ")}`
			: "";

		rows.push(
			`• *${item.task.name}*: ${formatRewardText(item.rewards)}${levelText}`
		);
	}

	rows.push("", commandHint("Cek board", `${prefix}tavern`));

	return rows.join("\n");
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

function formatBossTopDamage(boss) {
	const top = getWorldBossTopDamage(boss, 5);

	if (!top.length) {
		return [itemBullet("Belum ada damage.", "▫️")];
	}

	return top.map(
		(participant, index) =>
			`${index + 1}. *${participant.name}* - ${formatNumber(participant.damage)} dmg (${participant.attacks} hit)`
	);
}

function formatWorldBossRewardRows(rewards = []) {
	return rewards.slice(0, 5).map((entry) => {
		const levelText = entry.reward.levels.length
			? ` | Lv up ${entry.reward.levels.join(", ")}`
			: "";
		const killerText = entry.killer ? " | Last hit" : "";

		return `• #${entry.rank} *${entry.participant.name}*: ${formatRewardText(entry.reward)}${killerText}${levelText}`;
	});
}

export function formatWorldBossStatus(result, prefix = ".") {
	const boss = result.boss;

	if (!boss) {
		return [
			...chatHeader("🌋", "World Boss", "Belum ada boss aktif"),
			commandHint("Panggil status", `${prefix}boss`),
		].join("\n");
	}

	if (result.status === "cooldown") {
		return [
			...chatHeader("🌋", "World Boss Dikalahkan", boss.name),
			`🏁 Last hit: *${boss.killer?.name || "-"}*`,
			`⏳ Boss berikutnya: *${formatDuration(result.remaining)}*`,
			...sectionTitle("📊", "Top Damage"),
			...formatBossTopDamage(boss),
		].join("\n");
	}

	return [
		...chatHeader(
			boss.icon || "🌋",
			boss.name,
			`${boss.subtitle || "World Boss"} | Lv ${boss.level}`
		),
		`❤️ HP  ${progressBar(boss.hp, boss.maxHp, 16)} *${formatNumber(boss.hp)}/${formatNumber(boss.maxHp)}*`,
		`⏳ Sisa waktu: *${formatDuration(result.remaining)}*`,
		...sectionTitle("📊", "Top Damage"),
		...formatBossTopDamage(boss),
		"",
		commandHint("Serang", `${prefix}serangboss`),
		commandHint("Alias", `${prefix}raid`),
	].join("\n");
}

export function formatWorldBossAttackResult(result, prefix = ".") {
	if (result.status === "cooldown") {
		return formatWorldBossStatus(result, prefix);
	}

	if (result.status === "attack_cooldown") {
		return [
			...chatHeader("⏳", "Serangan Belum Siap"),
			`Tunggu *${formatDuration(result.remaining)}* sebelum menyerang lagi.`,
			commandHint("Cek boss", `${prefix}boss`),
		].join("\n");
	}

	if (result.status === "low_hp") {
		return [
			...chatHeader("❤️", "HP Terlalu Rendah"),
			`Pulihkan dulu: \`${prefix}heal\``,
		].join("\n");
	}

	if (result.status === "no_energy") {
		return [
			...chatHeader("⚡", "Energi Kurang"),
			`Butuh energi: *${result.needed}*`,
			`Isi energi: \`${prefix}daily\` atau \`${prefix}beli ether\``,
		].join("\n");
	}

	const boss = result.boss;
	const rows = [
		...chatHeader(
			result.status === "defeated" ? "🏆" : boss.icon || "🌋",
			result.status === "defeated"
				? "World Boss Tumbang"
				: "Serangan Masuk",
			boss.name
		),
		`⚔️ Damage: *${formatNumber(result.attack.damage)}*`,
		`💥 Counter: *${result.attack.counterDamage} HP*`,
		`⚡ Energy: *-${result.attack.energyCost}*`,
	];

	if (result.status === "defeated") {
		rows.push(
			...sectionTitle("🎁", "Reward"),
			...formatWorldBossRewardRows(result.rewards),
			"",
			`⏳ Boss berikutnya: *${formatDuration(result.remaining)}*`
		);
	} else {
		rows.push(
			`❤️ Boss HP: *${formatNumber(boss.hp)}/${formatNumber(boss.maxHp)}*`,
			...sectionTitle("📊", "Top Damage"),
			...formatBossTopDamage(boss),
			"",
			commandHint("Cek boss", `${prefix}boss`)
		);
	}

	return rows.join("\n");
}

function formatDungeonMemberStatus(member) {
	const name = member.name || member.member?.display_name || "Member";

	if (member.status === "missing_character") {
		return `• *${name}*: belum punya karakter`;
	}

	if (member.status === "low_hp") {
		return `• *${name}*: HP terlalu rendah`;
	}

	if (member.status === "no_energy") {
		return `• *${name}*: energi kurang`;
	}

	if (member.status === "cooldown") {
		return `• *${name}*: cooldown ${formatDuration(member.remaining)}`;
	}

	return `• *${name}*: siap`;
}

function formatDungeonRewardRows(rewards = []) {
	return rewards.map((entry) => {
		const levelText = entry.reward.levels.length
			? ` | Lv up ${entry.reward.levels.join(", ")}`
			: "";

		return `• *${entry.name}*: ${formatRewardText(entry.reward)}${levelText}`;
	});
}

export function formatDungeonResult(result, prefix = ".") {
	if (result.status === "missing_squad") {
		return [
			...chatHeader("👥", "Dungeon Squad", "Butuh squad aktif"),
			`Buat squad: \`${prefix}squad buat Nama Squad\``,
			`Join squad: \`${prefix}squad join KODE\``,
		].join("\n");
	}

	if (result.status === "squad_error") {
		return [
			...chatHeader("👥", "Dungeon Squad", "Gagal membaca squad"),
			result.error?.message || result.squad?.status || "unknown",
		].join("\n");
	}

	if (result.status === "missing") {
		return [
			...chatHeader("🧭", "Belum Punya Karakter"),
			`Mulai dulu: \`${prefix}mulai warrior\``,
		].join("\n");
	}

	if (result.status === "no_ready_members") {
		return [
			...chatHeader(
				"🏰",
				"Dungeon Belum Siap",
				`Energy cost ${result.energyCost}`
			),
			...sectionTitle("👥", "Status Squad"),
			...(result.members || []).map(formatDungeonMemberStatus),
			"",
			commandHint("Pulihkan", `${prefix}heal`),
			commandHint("Cek squad", `${prefix}squad`),
		].join("\n");
	}

	const cleared = result.simulation.cleared;
	const total = result.dungeon.rooms.length;
	const rows = [
		...chatHeader(
			result.status === "cleared" ? "🏆" : "🏰",
			result.status === "cleared" ? "Dungeon Selesai" : "Dungeon Gagal",
			`${result.dungeon.name} | ${result.squad.squad.name}`
		),
		`_${result.dungeon.subtitle}_`,
		`👥 Party: *${result.rewards.length}/${result.squad.squad.max_members}*`,
		`🚪 Room clear: *${cleared}/${total}*`,
		`⚡ Energy: *-${result.energyCost}*`,
		...sectionTitle("🚪", "Room"),
		...result.simulation.rooms.map((room, index) => {
			const icon = room.success ? "✅" : "❌";
			return `${icon} ${index + 1}. *${room.name}* (${formatNumber(room.rollPower)}/${formatNumber(room.target)})`;
		}),
		...sectionTitle("🎁", "Reward"),
		...formatDungeonRewardRows(result.rewards),
		"",
		`Cooldown: *${formatDuration(result.cooldown)}*`,
		commandHint("Cek misi", `${prefix}misi harian`),
	];

	return rows.join("\n");
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
