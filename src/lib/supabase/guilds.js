import { isSupabaseConfigured } from "#config/supabase";
import { getSupabaseAdmin } from "#lib/supabase/client";

export const GUILDS = {
	adventurer: {
		key: "adventurer",
		name: "Guild Petualang",
		icon: "⚔️",
		activity: "jelajah",
		description:
			"Untuk pemain yang ingin fokus berburu monster, raid, dan dungeon.",
	},
	merchant: {
		key: "merchant",
		name: "Guild Pedagang",
		icon: "🪙",
		activity: "kerja",
		description:
			"Untuk pemain yang ingin fokus kerja, farming material, dan ekonomi.",
	},
};

const GUILD_ALIASES = {
	adventure: "adventurer",
	adventurer: "adventurer",
	berburu: "adventurer",
	jelajah: "adventurer",
	petualang: "adventurer",
	petualangan: "adventurer",
	dagang: "merchant",
	kerja: "merchant",
	merchant: "merchant",
	pedagang: "merchant",
	trader: "merchant",
};

function normalizeInput(input) {
	return String(input || "")
		.toLowerCase()
		.trim()
		.replace(/[\s-]+/g, "_");
}

function normalizeJid(jid) {
	const raw = String(jid || "").trim();

	if (!raw) {
		return "";
	}

	if (raw.includes("@")) {
		return raw;
	}

	const digits = raw.replace(/\D/g, "");

	return digits ? `${digits}@s.whatsapp.net` : "";
}

export function normalizeGuildKey(input) {
	const key = normalizeInput(input);

	return GUILDS[key] ? key : GUILD_ALIASES[key] || null;
}

async function getLinkByWhatsApp(supabase, whatsappJid) {
	const { data, error } = await supabase
		.from("whatsapp_links")
		.select("user_id, display_name")
		.eq("whatsapp_jid", whatsappJid)
		.maybeSingle();

	if (error) {
		return {
			status: "error",
			error,
		};
	}

	return {
		status: "ok",
		link: data || null,
	};
}

async function queryGuildRows(supabase, { whatsappJid = "", userId = "" }) {
	const queries = [];

	if (whatsappJid) {
		queries.push(
			supabase
				.from("guild_memberships")
				.select("*")
				.eq("whatsapp_jid", whatsappJid)
				.eq("status", "active")
		);
	}

	if (userId) {
		queries.push(
			supabase
				.from("guild_memberships")
				.select("*")
				.eq("user_id", userId)
				.eq("status", "active")
		);
	}

	if (!queries.length) {
		return {
			status: "ok",
			rows: [],
		};
	}

	const results = await Promise.all(queries);
	const error = results.find((result) => result.error)?.error;

	if (error) {
		return {
			status: "error",
			error,
		};
	}

	const rows = new Map();

	for (const result of results) {
		for (const row of result.data || []) {
			rows.set(row.id, row);
		}
	}

	return {
		status: "ok",
		rows: [...rows.values()],
	};
}

export async function getGuildStatusForIdentity({
	whatsappJid = "",
	userId = "",
} = {}) {
	if (!isSupabaseConfigured()) {
		return {
			status: "not_configured",
		};
	}

	const jid = normalizeJid(whatsappJid);
	const supabase = getSupabaseAdmin();
	const result = await queryGuildRows(supabase, {
		whatsappJid: jid,
		userId,
	});

	if (result.status !== "ok") {
		return result;
	}

	const memberships = Object.fromEntries(
		result.rows.map((row) => [row.guild_key, row])
	);

	return {
		status: "ok",
		whatsappJid: jid,
		userId,
		rows: result.rows,
		memberships,
		label: formatGuildLabel(memberships),
	};
}

export async function getGuildStatusByWhatsApp(whatsappJid) {
	if (!isSupabaseConfigured()) {
		return {
			status: "not_configured",
		};
	}

	const jid = normalizeJid(whatsappJid);

	if (!jid) {
		return {
			status: "invalid_jid",
		};
	}

	const supabase = getSupabaseAdmin();
	const link = await getLinkByWhatsApp(supabase, jid);

	if (link.status !== "ok") {
		return link;
	}

	const status = await getGuildStatusForIdentity({
		whatsappJid: jid,
		userId: link.link?.user_id || "",
	});

	return {
		...status,
		link: link.link,
	};
}

export async function registerGuildMembership({
	whatsappJid,
	displayName = "",
	guildKey,
}) {
	if (!isSupabaseConfigured()) {
		return {
			status: "not_configured",
		};
	}

	const jid = normalizeJid(whatsappJid);
	const normalizedGuild = normalizeGuildKey(guildKey);

	if (!jid) {
		return {
			status: "invalid_jid",
		};
	}

	if (!normalizedGuild) {
		return {
			status: "invalid_guild",
		};
	}

	const supabase = getSupabaseAdmin();
	const link = await getLinkByWhatsApp(supabase, jid);

	if (link.status !== "ok") {
		return link;
	}

	const { data: existing, error: existingError } = await supabase
		.from("guild_memberships")
		.select("*")
		.eq("whatsapp_jid", jid)
		.eq("guild_key", normalizedGuild)
		.eq("status", "active")
		.maybeSingle();

	if (existingError) {
		return {
			status: "error",
			error: existingError,
		};
	}

	if (existing) {
		return {
			status: "already_joined",
			membership: existing,
			guild: GUILDS[normalizedGuild],
		};
	}

	const { data, error } = await supabase
		.from("guild_memberships")
		.insert({
			user_id: link.link?.user_id || null,
			whatsapp_jid: jid,
			display_name: link.link?.display_name || displayName || "",
			guild_key: normalizedGuild,
			status: "active",
			rank: "bronze",
			points: 0,
		})
		.select("*")
		.single();

	if (error) {
		return {
			status: "error",
			error,
		};
	}

	return {
		status: "ok",
		membership: data,
		guild: GUILDS[normalizedGuild],
	};
}

export async function addGuildPoints(whatsappJid, guildKey, points = 0) {
	if (!isSupabaseConfigured()) {
		return {
			status: "not_configured",
		};
	}

	const jid = normalizeJid(whatsappJid);
	const normalizedGuild = normalizeGuildKey(guildKey);
	const amount = Math.max(0, Number(points) || 0);

	if (!jid) {
		return {
			status: "invalid_jid",
		};
	}

	if (!normalizedGuild || !amount) {
		return {
			status: "invalid_guild",
		};
	}

	const supabase = getSupabaseAdmin();
	const { data: membership, error: findError } = await supabase
		.from("guild_memberships")
		.select("id, points")
		.eq("whatsapp_jid", jid)
		.eq("guild_key", normalizedGuild)
		.eq("status", "active")
		.maybeSingle();

	if (findError) {
		return {
			status: "error",
			error: findError,
		};
	}

	if (!membership) {
		return {
			status: "missing_guild",
			requiredGuild: GUILDS[normalizedGuild],
		};
	}

	const nextPoints = Math.max(0, Number(membership.points) || 0) + amount;
	const { data, error } = await supabase
		.from("guild_memberships")
		.update({
			points: nextPoints,
		})
		.eq("id", membership.id)
		.select("*")
		.single();

	if (error) {
		return {
			status: "error",
			error,
		};
	}

	return {
		status: "ok",
		membership: data,
		points: amount,
	};
}

export async function requireGuildMembership(whatsappJid, guildKey) {
	const normalizedGuild = normalizeGuildKey(guildKey);
	const status = await getGuildStatusByWhatsApp(whatsappJid);

	if (status.status !== "ok") {
		return status;
	}

	if (!status.memberships[normalizedGuild]) {
		return {
			...status,
			status: "missing_guild",
			requiredGuild: GUILDS[normalizedGuild],
		};
	}

	return {
		...status,
		status: "ok",
		requiredGuild: GUILDS[normalizedGuild],
		membership: status.memberships[normalizedGuild],
	};
}

export function formatGuildLabel(memberships = {}) {
	const labels = Object.keys(GUILDS)
		.filter((key) => memberships[key])
		.map((key) => GUILDS[key].name);

	return labels.join(" + ") || "Belum daftar";
}

export function formatGuildStatus(result, prefix = ".") {
	const memberships = result?.memberships || {};
	const rows = Object.values(GUILDS).map((guild) => {
		const membership = memberships[guild.key];
		const status = membership
			? `Aktif | Rank ${membership.rank} | ${membership.points} poin`
			: "Belum daftar";

		return [
			`${membership ? "✅" : "▫️"} *${guild.name}*`,
			`   ${guild.description}`,
			`   Status: ${status}`,
			`   Daftar: \`${prefix}guild ${guild.key === "adventurer" ? "petualang" : "pedagang"}\``,
		].join("\n");
	});

	return [
		"🏛️ *Guild Aetheria*",
		"━━━━━━━━━━━━━━━━━━━━",
		...rows,
		"",
		"📌 *Syarat Aktivitas*",
		`• Jelajah: daftar \`${prefix}guild petualang\``,
		`• Kerja: daftar \`${prefix}guild pedagang\``,
		"",
		`Cek squad: \`${prefix}squad\``,
	].join("\n");
}

export function formatGuildJoinResult(result) {
	const guild = result.guild;

	return [
		result.status === "already_joined"
			? "✅ *Sudah Terdaftar*"
			: "✅ *Guild Terdaftar*",
		"━━━━━━━━━━━━━━━━━━━━",
		`${guild.icon} Guild: *${guild.name}*`,
		`Rank: *${result.membership.rank}*`,
		`Poin: *${result.membership.points}*`,
	].join("\n");
}

export function formatMissingGuild(requiredGuild, prefix = ".") {
	return [
		"🏛️ *Daftar Guild Dulu*",
		"━━━━━━━━━━━━━━━━━━━━",
		`${requiredGuild.icon} Aktivitas ini butuh *${requiredGuild.name}*.`,
		"",
		`Daftar: \`${prefix}guild ${requiredGuild.key === "adventurer" ? "petualang" : "pedagang"}\``,
		`Cek guild: \`${prefix}guild\``,
	].join("\n");
}
