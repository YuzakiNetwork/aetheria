import { BRAND_CONFIG } from "#config/brand";

const DEFAULT_PREFIX = ".";
const FOOTER = `${BRAND_CONFIG.name} RPG`;

const ACTIONS = {
	adventure: ["Jelajah", "jelajah"],
	bestiary: ["Bestiary", "bestiary"],
	boss: ["Boss", "boss"],
	bossAttack: ["Serang Boss", "serangboss"],
	buyEther: ["Beli Ether", "beli ether"],
	buyPotion: ["Beli Potion", "beli potion 2"],
	chess: ["Catur", "chess"],
	comeback: ["Kembali", "kembali"],
	craft: ["Craft", "craft list"],
	daily: ["Daily", "daily"],
	dungeon: ["Dungeon", "dungeon"],
	guide: ["Guide", "guide"],
	guild: ["Guild", "guild"],
	heal: ["Heal", "heal"],
	inventory: ["Inventory", "inventory"],
	land: ["Aetheria Land", "land"],
	map: ["Map", "map"],
	menu: ["Menu RPG", "rpg"],
	profile: ["Profil", "profil"],
	progress: ["Progress", "progress"],
	quest: ["Misi", "misi"],
	questBeginner: ["Misi Pemula", "misi pemula"],
	questClaim: ["Claim Misi", "misi claim"],
	questDaily: ["Misi Harian", "misi harian"],
	sell: ["Jual", "jual"],
	shop: ["Toko", "shop"],
	skill: ["Skill", "skill"],
	squad: ["Squad", "squad"],
	start: ["Mulai", "mulai"],
	snakes: ["Ular Tangga", "ular"],
	tavern: ["Tavern", "tavern"],
	upgrade: ["Upgrade", "upgrade"],
	work: ["Kerja", "kerja"],
	workFish: ["Mancing", "kerja fish"],
	workForage: ["Forage", "kerja forage"],
	workMine: ["Nambang", "kerja mine"],
};

const PRESETS = {
	adventure: ["adventure", "questDaily", "inventory", "heal", "menu"],
	boss: ["bossAttack", "boss", "heal", "daily", "menu"],
	bossCooldown: ["quest", "adventure", "profile", "menu"],
	daily: ["tavern", "questDaily", "adventure", "work", "menu"],
	default: ["profile", "quest", "daily", "adventure", "inventory"],
	energyLow: ["daily", "buyEther", "work", "menu"],
	heal: ["adventure", "boss", "inventory", "shop", "menu"],
	hpLow: ["heal", "buyPotion", "daily", "inventory", "menu"],
	inventory: ["shop", "craft", "upgrade", "sell", "menu"],
	missing: ["start", "guide", "menu"],
	quest: ["questClaim", "tavern", "questDaily", "adventure", "menu"],
	shop: ["buyPotion", "buyEther", "craft", "inventory", "menu"],
	starter: ["questBeginner", "daily", "guild", "profile", "menu"],
	tabletop: ["land", "chess", "snakes", "tavern", "menu"],
	work: ["workMine", "workForage", "workFish", "questDaily", "menu"],
};

function normalizePrefix(prefix) {
	return typeof prefix === "string" && prefix ? prefix : DEFAULT_PREFIX;
}

function toButton(prefix, action) {
	if (typeof action === "string") {
		const [text, command] = ACTIONS[action] || [action, action];

		return {
			text,
			id: `${normalizePrefix(prefix)}${command}`,
		};
	}

	return {
		...action,
		id: action?.id?.startsWith(normalizePrefix(prefix))
			? action.id
			: `${normalizePrefix(prefix)}${action?.id || action?.command || ""}`,
	};
}

export function buildRpgActionButtons(
	prefix = DEFAULT_PREFIX,
	preset = "default"
) {
	const actionKeys = PRESETS[preset] || PRESETS.default;

	return actionKeys.map((action) => toButton(prefix, action));
}

export function buildRpgHomeSections(prefix = DEFAULT_PREFIX) {
	return [
		{
			title: "Karakter",
			rows: [
				{
					title: "Profil",
					description: "Status karakter, level, HP, dan energi",
					id: `${normalizePrefix(prefix)}profil`,
				},
				{
					title: "Guide",
					description: "Arahan progress berikutnya",
					id: `${normalizePrefix(prefix)}guide`,
				},
				{
					title: "Kembali",
					description: "Jalur cepat untuk user yang lama tidak aktif",
					id: `${normalizePrefix(prefix)}kembali`,
				},
				{
					title: "Progress",
					description: "Checklist perkembangan karakter",
					id: `${normalizePrefix(prefix)}progress`,
				},
			],
		},
		{
			title: "Petualangan",
			rows: [
				{
					title: "Jelajah",
					description: "Cari monster, XP, gold, dan item",
					id: `${normalizePrefix(prefix)}jelajah`,
				},
				{
					title: "Dungeon",
					description: "Dungeon mini bersama squad aktif",
					id: `${normalizePrefix(prefix)}dungeon`,
				},
				{
					title: "World Boss",
					description: "Raid boss grup dan lihat top damage",
					id: `${normalizePrefix(prefix)}boss`,
				},
				{
					title: "Misi",
					description: "Quest harian, mingguan, guild, dan pemula",
					id: `${normalizePrefix(prefix)}misi`,
				},
				{
					title: "Tavern Board",
					description: "Task harian/mingguan ringan dan reward claim",
					id: `${normalizePrefix(prefix)}tavern`,
				},
			],
		},
		{
			title: "Inventory dan Economy",
			rows: [
				{
					title: "Inventory",
					description: "Item, gold, dan gear yang dipakai",
					id: `${normalizePrefix(prefix)}inventory`,
				},
				{
					title: "Toko",
					description: "Beli potion, ether, dan gear",
					id: `${normalizePrefix(prefix)}shop`,
				},
				{
					title: "Craft",
					description: "Buat item dari material",
					id: `${normalizePrefix(prefix)}craft list`,
				},
				{
					title: "Kerja",
					description: "Farming gold dan material risiko rendah",
					id: `${normalizePrefix(prefix)}kerja`,
				},
			],
		},
		{
			title: "Sosial dan Koleksi",
			rows: [
				{
					title: "Guild",
					description: "Pilih jalur guild dan misi guild",
					id: `${normalizePrefix(prefix)}guild`,
				},
				{
					title: "Squad",
					description: "Kelola squad untuk dungeon",
					id: `${normalizePrefix(prefix)}squad`,
				},
				{
					title: "Bestiary",
					description: "Monster, zona, dan skill absorb",
					id: `${normalizePrefix(prefix)}bestiary`,
				},
				{
					title: "Skill",
					description: "Skill aktif dan shard absorb",
					id: `${normalizePrefix(prefix)}skill`,
				},
			],
		},
		{
			title: "Tabletop Grup",
			rows: [
				{
					title: "Aetheria Land",
					description:
						"Game ekonomi grup: beli wilayah, bayar sewa, dan bertahan sampai akhir",
					id: `${normalizePrefix(prefix)}land`,
				},
				{
					title: "Catur Aetheria",
					description: "Catur turn-based dengan notasi e2e4",
					id: `${normalizePrefix(prefix)}chess`,
				},
				{
					title: "Ular Tangga",
					description: "Game dadu ringan untuk grup",
					id: `${normalizePrefix(prefix)}ular`,
				},
			],
		},
	];
}

export function formatRpgHome(player, prefix = DEFAULT_PREFIX) {
	const lines = [`🌌 *${BRAND_CONFIG.name} RPG Hub*`, "━━━━━━━━━━━━━━━━━━━━"];

	if (player) {
		lines.push(
			`👤 *${player.name}* | Lv *${player.level}* | ${player.class}`,
			`❤️ HP *${player.hp}/${player.maxHp}* | ⚡ Energy *${player.energy}/${player.maxEnergy}*`,
			`💰 Gold *${player.gold}*`,
			""
		);
	} else {
		lines.push(
			"Mulai atau lanjutkan petualangan dari satu menu.",
			`Belum punya karakter? Ketik \`${normalizePrefix(prefix)}mulai\`.`,
			""
		);
	}

	lines.push(
		"Gunakan tombol/list di bawah untuk memilih aksi.",
		`Shortcut: \`${normalizePrefix(prefix)}kembali\`, \`${normalizePrefix(prefix)}guide\`, \`${normalizePrefix(prefix)}tavern\`, \`${normalizePrefix(prefix)}land\`.`
	);

	return lines.join("\n");
}

export async function replyRpgActions(
	m,
	text,
	preset = "default",
	options = {}
) {
	const buttons = options.buttons || buildRpgActionButtons(m.prefix, preset);
	const footer = options.footer || FOOTER;

	if (typeof m.replyInteractive === "function") {
		await m.replyInteractive(text, buttons, {
			...options,
			footer,
		});
		return;
	}

	if (typeof m.replyButtons === "function") {
		await m.replyButtons(text, buttons, {
			...options,
			footer,
		});
		return;
	}

	await m.reply(text);
}

export async function replyRpgList(m, text, sections, options = {}) {
	if (typeof m.replyList === "function") {
		await m.replyList(text, sections, {
			buttonText: "Pilih Aksi",
			footer: FOOTER,
			title: `${BRAND_CONFIG.name} RPG`,
			...options,
		});
		return;
	}

	const buttons = sections
		.flatMap((section) => section.rows || [])
		.slice(0, 5)
		.map((row) => ({
			text: row.title,
			id: row.id,
		}));

	await replyRpgActions(m, text, "default", {
		...options,
		buttons,
	});
}

export async function replyMissingCharacter(m) {
	await replyRpgActions(
		m,
		[
			"🧭 *Belum Punya Karakter*",
			`Mulai dulu: \`${normalizePrefix(m.prefix)}mulai warrior\``,
		].join("\n"),
		"missing"
	);
}
