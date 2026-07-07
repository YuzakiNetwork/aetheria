import {
	claimDaily,
	claimQuestReward,
	formatAdventureResult,
	formatClassList,
	formatCooldown,
	formatDailyResult,
	formatJobResult,
	formatLeaderboard,
	formatPlayerGuide,
	formatProfile,
	formatQuestBoard,
	formatQuestClaimResult,
	formatUseItemResult,
	getLeaderboard,
	getPlayerProfile,
	getQuestStatus,
	registerPlayer,
	runAdventure,
	runJob,
	useConsumable,
} from "#lib/rpg";
import {
	formatGuildJoinResult,
	formatGuildStatus,
	formatMissingGuild,
	registerGuildMembership,
	requireGuildMembership,
} from "#lib/supabase/guilds";
import {
	DISCORD_COLOR,
	DISCORD_ERROR_COLOR,
	DISCORD_SUCCESS_COLOR,
} from "#platforms/discord/format";

const CHAT_INPUT_COMMAND_TYPE = 1;
const STRING_OPTION_TYPE = 3;
const INTEGER_OPTION_TYPE = 4;
const DESCRIPTION_LIMIT = 3900;
const DISCORD_PLAYER_DOMAIN = "discord";

const CLASS_CHOICES = [
	{ name: "Warrior", value: "warrior" },
	{ name: "Rogue", value: "rogue" },
	{ name: "Mage", value: "mage" },
	{ name: "Ranger", value: "ranger" },
];

const QUEST_TYPE_CHOICES = [
	{ name: "Semua", value: "all" },
	{ name: "Pemula", value: "beginner" },
	{ name: "Harian", value: "daily" },
	{ name: "Mingguan", value: "weekly" },
	{ name: "Guild", value: "guild" },
];

const GUILD_CHOICES = [
	{ name: "Petualang", value: "adventurer" },
	{ name: "Pedagang", value: "merchant" },
];

const JOB_CHOICES = [
	{ name: "Mine", value: "mine" },
	{ name: "Forage", value: "forage" },
	{ name: "Fish", value: "fish" },
];

const ITEM_CHOICES = [
	{ name: "Potion", value: "potion" },
	{ name: "Ether", value: "ether" },
	{ name: "Hi-Potion", value: "hi_potion" },
	{ name: "Greater Ether", value: "greater_ether" },
	{ name: "Field Ration", value: "field_ration" },
];

export const DISCORD_RPG_COMMAND_NAMES = [
	"rpg",
	"start",
	"profile",
	"daily",
	"quest",
	"guild",
	"adventure",
	"work",
	"heal",
	"leaderboard",
];

export const DISCORD_RPG_COMMANDS = [
	{
		description: "Buka hub RPG Aetheria di Discord.",
		name: "rpg",
		type: CHAT_INPUT_COMMAND_TYPE,
	},
	{
		description: "Buat karakter RPG Discord.",
		name: "start",
		options: [
			{
				choices: CLASS_CHOICES,
				description: "Class awal karakter.",
				name: "class",
				required: false,
				type: STRING_OPTION_TYPE,
			},
		],
		type: CHAT_INPUT_COMMAND_TYPE,
	},
	{
		description: "Lihat profil karakter RPG.",
		name: "profile",
		type: CHAT_INPUT_COMMAND_TYPE,
	},
	{
		description: "Ambil daily reward.",
		name: "daily",
		type: CHAT_INPUT_COMMAND_TYPE,
	},
	{
		description: "Lihat atau claim misi RPG.",
		name: "quest",
		options: [
			{
				choices: [
					{ name: "Lihat", value: "view" },
					{ name: "Claim", value: "claim" },
				],
				description: "Aksi misi.",
				name: "action",
				required: false,
				type: STRING_OPTION_TYPE,
			},
			{
				choices: QUEST_TYPE_CHOICES,
				description: "Kategori misi.",
				name: "type",
				required: false,
				type: STRING_OPTION_TYPE,
			},
			{
				description: "Target claim: ready, semua, daily, atau id misi.",
				name: "target",
				required: false,
				type: STRING_OPTION_TYPE,
			},
		],
		type: CHAT_INPUT_COMMAND_TYPE,
	},
	{
		description: "Cek atau daftar guild RPG.",
		name: "guild",
		options: [
			{
				choices: [
					{ name: "Status", value: "status" },
					{ name: "Join", value: "join" },
				],
				description: "Aksi guild.",
				name: "action",
				required: false,
				type: STRING_OPTION_TYPE,
			},
			{
				choices: GUILD_CHOICES,
				description: "Guild yang ingin diikuti.",
				name: "guild",
				required: false,
				type: STRING_OPTION_TYPE,
			},
		],
		type: CHAT_INPUT_COMMAND_TYPE,
	},
	{
		description: "Jelajah dan lawan monster.",
		name: "adventure",
		type: CHAT_INPUT_COMMAND_TYPE,
	},
	{
		description: "Kerja untuk gold, XP, dan material.",
		name: "work",
		options: [
			{
				choices: JOB_CHOICES,
				description: "Jenis kerja.",
				name: "job",
				required: false,
				type: STRING_OPTION_TYPE,
			},
		],
		type: CHAT_INPUT_COMMAND_TYPE,
	},
	{
		description: "Pakai potion, ether, atau consumable.",
		name: "heal",
		options: [
			{
				choices: ITEM_CHOICES,
				description: "Item yang dipakai.",
				name: "item",
				required: false,
				type: STRING_OPTION_TYPE,
			},
		],
		type: CHAT_INPUT_COMMAND_TYPE,
	},
	{
		description: "Lihat ranking karakter Aetheria.",
		name: "leaderboard",
		options: [
			{
				description: "Jumlah ranking, maksimal 20.",
				max_value: 20,
				min_value: 3,
				name: "limit",
				required: false,
				type: INTEGER_OPTION_TYPE,
			},
		],
		type: CHAT_INPUT_COMMAND_TYPE,
	},
];

function truncate(value = "", limit = DESCRIPTION_LIMIT) {
	const text = String(value || "").trim();

	if (text.length <= limit) {
		return text || "-";
	}

	return `${text.slice(0, limit - 24).trimEnd()}\n...`;
}

function toDiscordMarkdown(value = "") {
	return String(value || "")
		.replace(/\r\n/g, "\n")
		.replace(/\*([^*\n]+)\*/g, "**$1**")
		.replace(/`\/mulai\b/g, "`/start")
		.replace(/`\/profil\b/g, "`/profile")
		.replace(/`\/misi\b/g, "`/quest")
		.replace(/`\/jelajah\b/g, "`/adventure")
		.replace(/`\/kerja\b/g, "`/work")
		.replace(/`\/guild petualang`/g, "`/guild action:join guild:Petualang`")
		.replace(/`\/guild pedagang`/g, "`/guild action:join guild:Pedagang`")
		.replace(/`\/guild`/g, "`/guild")
		.replace(/`\/daily`/g, "`/daily")
		.replace(/`\/heal`/g, "`/heal");
}

function displayName(interaction = {}) {
	return (
		interaction.member?.displayName ||
		interaction.user?.globalName ||
		interaction.user?.username ||
		"Adventurer"
	);
}

export function getDiscordPlayerIdentity(interaction = {}) {
	const rawUserId = String(interaction.user?.id || "").trim();
	const userId = rawUserId ? `${rawUserId}@${DISCORD_PLAYER_DOMAIN}` : "";

	return {
		name: displayName(interaction),
		userId,
	};
}

export function isDiscordRpgCommand(commandName = "") {
	return DISCORD_RPG_COMMAND_NAMES.includes(commandName);
}

export function buildDiscordRpgTextPayload({
	color = DISCORD_COLOR,
	description = "",
	ephemeral = false,
	footer = "Aetheria RPG",
	title = "Aetheria RPG",
} = {}) {
	return {
		embeds: [
			{
				color,
				description: truncate(toDiscordMarkdown(description)),
				footer: { text: footer },
				title,
			},
		],
		ephemeral,
	};
}

function classPickerPayload() {
	return buildDiscordRpgTextPayload({
		description: [
			formatClassList("/"),
			"",
			"Di Discord pakai `/start class:Warrior` atau pilih class dari autocomplete slash command.",
		].join("\n"),
		footer: "Aetheria Start",
		title: "Pilih Class Aetheria",
	});
}

function missingCharacterPayload() {
	return buildDiscordRpgTextPayload({
		color: DISCORD_ERROR_COLOR,
		description: [
			"🧭 **Belum Punya Karakter**",
			"",
			"Mulai dulu dengan `/start class:Warrior`.",
			"Class tersedia: Warrior, Rogue, Mage, Ranger.",
		].join("\n"),
		footer: "Aetheria Start",
		title: "Karakter Belum Ada",
	});
}

function guildUnavailablePayload(result) {
	return buildDiscordRpgTextPayload({
		color: DISCORD_ERROR_COLOR,
		description: [
			"🏛️ **Guild belum bisa dipakai.**",
			"",
			result?.error?.message ||
				result?.status ||
				"Konfigurasi guild belum siap.",
		].join("\n"),
		footer: "Aetheria Guild",
		title: "Guild Error",
	});
}

async function handleRpg(interaction) {
	const identity = getDiscordPlayerIdentity(interaction);
	const profile = await getPlayerProfile(identity.userId, identity.name);

	if (profile.status === "missing") {
		return classPickerPayload();
	}

	return buildDiscordRpgTextPayload({
		description: [
			formatPlayerGuide(profile.player, "/"),
			"",
			"Discord loop aktif: `/daily`, `/quest`, `/guild`, `/adventure`, `/work`, `/heal`, `/leaderboard`.",
		].join("\n"),
		title: "Aetheria RPG Hub",
	});
}

async function handleStart(interaction) {
	const identity = getDiscordPlayerIdentity(interaction);
	const classInput = interaction.options.getString("class");

	if (!classInput) {
		return classPickerPayload();
	}

	const result = await registerPlayer(
		identity.userId,
		identity.name,
		classInput
	);

	if (result.status === "invalid_class") {
		return classPickerPayload();
	}

	if (result.status === "exists") {
		const profile = await getPlayerProfile(identity.userId, identity.name);
		const player = profile.status === "ok" ? profile.player : result.player;

		return buildDiscordRpgTextPayload({
			description: [
				"📌 **Karakter Sudah Ada**",
				"Progress lama tetap dipakai.",
				"",
				formatPlayerGuide(player, "/"),
			].join("\n"),
			title: "Karakter Sudah Ada",
		});
	}

	return buildDiscordRpgTextPayload({
		color: DISCORD_SUCCESS_COLOR,
		description: [
			"🌌 **Karakter Dibuat**",
			`Nama: **${result.player.name}**`,
			`Class: **${result.player.class}**`,
			"",
			formatProfile(result.player, "/"),
			"",
			"Langkah berikutnya: `/daily`, `/quest type:Pemula`, lalu `/guild action:join guild:Petualang` atau `/guild action:join guild:Pedagang`.",
		].join("\n"),
		footer: "Aetheria Start",
		title: "Karakter Dibuat",
	});
}

async function handleProfile(interaction) {
	const identity = getDiscordPlayerIdentity(interaction);
	const result = await getPlayerProfile(identity.userId, identity.name);

	if (result.status === "missing") {
		return missingCharacterPayload();
	}

	return buildDiscordRpgTextPayload({
		description: formatProfile(result.player, "/"),
		footer: "Aetheria Profile",
		title: `${result.player.name} Profile`,
	});
}

async function handleDaily(interaction) {
	const identity = getDiscordPlayerIdentity(interaction);
	const result = await claimDaily(identity.userId, identity.name);

	if (result.status === "missing") {
		return missingCharacterPayload();
	}

	if (result.status === "cooldown") {
		return buildDiscordRpgTextPayload({
			description: `⏳ Daily sudah diambil.\nReset dalam **${formatCooldown(result.remaining)}**.`,
			footer: "Aetheria Daily",
			title: "Daily Cooldown",
		});
	}

	return buildDiscordRpgTextPayload({
		color: DISCORD_SUCCESS_COLOR,
		description: formatDailyResult(result),
		footer: "Aetheria Daily",
		title: "Daily Reward",
	});
}

async function handleQuest(interaction) {
	const identity = getDiscordPlayerIdentity(interaction);
	const action = interaction.options.getString("action") || "view";
	const type = interaction.options.getString("type") || "all";
	const target = interaction.options.getString("target") || "";

	if (action === "claim") {
		const result = await claimQuestReward(
			identity.userId,
			identity.name,
			target || type || "ready"
		);

		if (result.status === "missing") {
			return missingCharacterPayload();
		}

		if (result.status === "nothing_ready") {
			return buildDiscordRpgTextPayload({
				description: [
					"📜 **Belum Ada Misi Siap Claim**",
					"",
					formatQuestBoard(result, "/"),
				].join("\n"),
				footer: "Aetheria Quest",
				title: "Quest",
			});
		}

		return buildDiscordRpgTextPayload({
			color: DISCORD_SUCCESS_COLOR,
			description: formatQuestClaimResult(result, "/"),
			footer: "Aetheria Quest",
			title: "Quest Claimed",
		});
	}

	const result = await getQuestStatus(identity.userId, identity.name, type);

	if (result.status === "missing") {
		return missingCharacterPayload();
	}

	return buildDiscordRpgTextPayload({
		description: formatQuestBoard(result, "/"),
		footer: "Aetheria Quest",
		title: "Quest Board",
	});
}

async function handleGuild(interaction) {
	const identity = getDiscordPlayerIdentity(interaction);
	const action = interaction.options.getString("action") || "status";
	const guildKey = interaction.options.getString("guild") || "";

	if (action === "join") {
		if (!guildKey) {
			return buildDiscordRpgTextPayload({
				description:
					"Pilih guild dulu: `/guild action:join guild:Petualang` atau `/guild action:join guild:Pedagang`.",
				footer: "Aetheria Guild",
				title: "Pilih Guild",
			});
		}

		const result = await registerGuildMembership({
			displayName: identity.name,
			guildKey,
			whatsappJid: identity.userId,
		});

		if (
			result.status === "not_configured" ||
			result.status === "invalid_jid"
		) {
			return guildUnavailablePayload(result);
		}

		if (result.status !== "ok" && result.status !== "already_joined") {
			return guildUnavailablePayload(result);
		}

		return buildDiscordRpgTextPayload({
			color: DISCORD_SUCCESS_COLOR,
			description: formatGuildJoinResult(result),
			footer: "Aetheria Guild",
			title: "Guild Joined",
		});
	}

	const result = await requireGuildMembership(identity.userId, "adventurer");

	if (result.status === "not_configured" || result.status === "invalid_jid") {
		return guildUnavailablePayload(result);
	}

	if (result.status !== "ok" && result.status !== "missing_guild") {
		return guildUnavailablePayload(result);
	}

	return buildDiscordRpgTextPayload({
		description: formatGuildStatus(result, "/"),
		footer: "Aetheria Guild",
		title: "Guild Aetheria",
	});
}

async function handleAdventure(interaction) {
	const identity = getDiscordPlayerIdentity(interaction);
	const profile = await getPlayerProfile(identity.userId, identity.name);

	if (profile.status === "missing") {
		return missingCharacterPayload();
	}

	const guild = await requireGuildMembership(identity.userId, "adventurer");

	if (guild.status === "missing_guild") {
		return buildDiscordRpgTextPayload({
			description: formatMissingGuild(guild.requiredGuild, "/"),
			footer: "Aetheria Guild",
			title: "Daftar Guild Dulu",
		});
	}

	if (guild.status !== "ok") {
		return guildUnavailablePayload(guild);
	}

	const result = await runAdventure(identity.userId, identity.name);

	if (result.status === "low_hp") {
		return buildDiscordRpgTextPayload({
			color: DISCORD_ERROR_COLOR,
			description: [
				"❤️ **HP Terlalu Rendah**",
				"Pakai potion: `/heal item:Potion`.",
				"",
				formatProfile(result.player, "/"),
			].join("\n"),
			footer: "Aetheria Adventure",
			title: "HP Rendah",
		});
	}

	if (result.status === "no_energy") {
		return buildDiscordRpgTextPayload({
			color: DISCORD_ERROR_COLOR,
			description: [
				"⚡ **Energi Kurang**",
				`Butuh energi: **${result.needed}**.`,
				"Isi energi lewat `/daily` atau `/heal item:Ether`.",
			].join("\n"),
			footer: "Aetheria Adventure",
			title: "Energi Kurang",
		});
	}

	return buildDiscordRpgTextPayload({
		description: formatAdventureResult(result),
		footer: "Aetheria Adventure",
		title: "Adventure Result",
	});
}

async function handleWork(interaction) {
	const identity = getDiscordPlayerIdentity(interaction);
	const profile = await getPlayerProfile(identity.userId, identity.name);

	if (profile.status === "missing") {
		return missingCharacterPayload();
	}

	const guild = await requireGuildMembership(identity.userId, "merchant");

	if (guild.status === "missing_guild") {
		return buildDiscordRpgTextPayload({
			description: formatMissingGuild(guild.requiredGuild, "/"),
			footer: "Aetheria Guild",
			title: "Daftar Guild Dulu",
		});
	}

	if (guild.status !== "ok") {
		return guildUnavailablePayload(guild);
	}

	const result = await runJob(
		identity.userId,
		identity.name,
		interaction.options.getString("job") || "mine"
	);

	if (result.status === "invalid_job") {
		return buildDiscordRpgTextPayload({
			description:
				"Pilihan kerja: `/work job:Mine`, `/work job:Forage`, atau `/work job:Fish`.",
			footer: "Aetheria Work",
			title: "Pilihan Kerja",
		});
	}

	if (result.status === "no_energy") {
		return buildDiscordRpgTextPayload({
			color: DISCORD_ERROR_COLOR,
			description: `⚡ Energi kurang. Butuh **${result.needed}**.`,
			footer: "Aetheria Work",
			title: "Energi Kurang",
		});
	}

	return buildDiscordRpgTextPayload({
		description: formatJobResult(result),
		footer: "Aetheria Work",
		title: "Work Result",
	});
}

async function handleHeal(interaction) {
	const identity = getDiscordPlayerIdentity(interaction);
	const item = interaction.options.getString("item") || "potion";
	const result = await useConsumable(identity.userId, identity.name, item);

	if (result.status === "missing") {
		return missingCharacterPayload();
	}

	if (result.status === "not_consumable") {
		return buildDiscordRpgTextPayload({
			color: DISCORD_ERROR_COLOR,
			description: "Item itu tidak bisa dipakai langsung.",
			footer: "Aetheria Inventory",
			title: "Item Tidak Bisa Dipakai",
		});
	}

	if (result.status === "no_item") {
		return buildDiscordRpgTextPayload({
			color: DISCORD_ERROR_COLOR,
			description: `${result.item.name} habis. Beli item dari WhatsApp untuk sementara, atau tunggu shop Discord berikutnya.`,
			footer: "Aetheria Shop",
			title: "Item Habis",
		});
	}

	if (result.status === "full") {
		return buildDiscordRpgTextPayload({
			description: "✅ Status sudah penuh.",
			footer: "Aetheria Heal",
			title: "Status Penuh",
		});
	}

	return buildDiscordRpgTextPayload({
		color: DISCORD_SUCCESS_COLOR,
		description: formatUseItemResult(result),
		footer: "Aetheria Heal",
		title: "Heal Result",
	});
}

async function handleLeaderboard(interaction) {
	const limit = interaction.options.getInteger("limit") || 10;
	const entries = await getLeaderboard(limit);

	return buildDiscordRpgTextPayload({
		description: formatLeaderboard(entries, "/"),
		footer: "Aetheria Leaderboard",
		title: "Leaderboard",
	});
}

export async function handleDiscordRpgCommand(interaction) {
	if (!isDiscordRpgCommand(interaction.commandName)) {
		return null;
	}

	if (interaction.commandName === "rpg") {
		return handleRpg(interaction);
	}

	if (interaction.commandName === "start") {
		return handleStart(interaction);
	}

	if (interaction.commandName === "profile") {
		return handleProfile(interaction);
	}

	if (interaction.commandName === "daily") {
		return handleDaily(interaction);
	}

	if (interaction.commandName === "quest") {
		return handleQuest(interaction);
	}

	if (interaction.commandName === "guild") {
		return handleGuild(interaction);
	}

	if (interaction.commandName === "adventure") {
		return handleAdventure(interaction);
	}

	if (interaction.commandName === "work") {
		return handleWork(interaction);
	}

	if (interaction.commandName === "heal") {
		return handleHeal(interaction);
	}

	if (interaction.commandName === "leaderboard") {
		return handleLeaderboard(interaction);
	}

	return null;
}
