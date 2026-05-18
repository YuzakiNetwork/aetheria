import { MONETIZATION_CONFIG } from "#config/monetization";
import { isSupabaseConfigured } from "#config/supabase";
import { getSupabaseAdmin } from "#lib/supabase/client";

export const PREMIUM_TYPES = {
	supporter: {
		key: "supporter",
		name: "Supporter",
		icon: "💎",
		price: MONETIZATION_CONFIG.supporterPrice,
		description: "Badge supporter dan kosmetik ringan untuk dukung bot.",
		benefits: [
			"Badge Supporter di profil",
			"Title supporter",
			"Nama tampil lebih menonjol di dashboard",
			"Prioritas ikut event komunitas",
		],
	},
	aether_pass: {
		key: "aether_pass",
		name: "Aether Pass",
		icon: "🌌",
		price: MONETIZATION_CONFIG.aetherPassPrice,
		description:
			"Pass pra-season 30 hari. Belum terikat season karena season belum aktif.",
		benefits: [
			"Badge Aether Pass Pra-Season",
			"Title pass terbatas",
			"Quest dan kosmetik pra-season saat fitur season siap",
			"Benefit supporter ikut aktif selama pass berjalan",
		],
	},
};

const TYPE_ALIASES = {
	support: "supporter",
	supporter: "supporter",
	vip: "supporter",
	pass: "aether_pass",
	aether: "aether_pass",
	aetherpass: "aether_pass",
	aether_pass: "aether_pass",
	season: "aether_pass",
};

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

export function normalizePremiumType(input) {
	const key = String(input || "")
		.toLowerCase()
		.trim()
		.replace(/[\s-]+/g, "_");

	return TYPE_ALIASES[key] || null;
}

function formatDate(value) {
	if (!value) {
		return "Lifetime";
	}

	return new Intl.DateTimeFormat("id-ID", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "Asia/Jakarta",
	}).format(new Date(value));
}

function daysLeft(value) {
	if (!value) {
		return "Lifetime";
	}

	const ms = new Date(value).getTime() - Date.now();

	if (!Number.isFinite(ms) || ms <= 0) {
		return "berakhir";
	}

	const days = Math.ceil(ms / 86400000);

	return `${days} hari`;
}

function isActive(row) {
	if (!row || row.status !== "active") {
		return false;
	}

	if (!row.expires_at) {
		return true;
	}

	return new Date(row.expires_at).getTime() > Date.now();
}

function pickActive(rows, type) {
	const matches = rows.filter((row) => row.type === type && isActive(row));

	if (!matches.length) {
		return null;
	}

	return matches.sort((a, b) => {
		const aTime = a.expires_at
			? new Date(a.expires_at).getTime()
			: Number.MAX_SAFE_INTEGER;
		const bTime = b.expires_at
			? new Date(b.expires_at).getTime()
			: Number.MAX_SAFE_INTEGER;

		return bTime - aTime;
	})[0];
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

async function queryEntitlements(supabase, { whatsappJid = "", userId = "" }) {
	const queries = [];

	if (whatsappJid) {
		queries.push(
			supabase
				.from("premium_entitlements")
				.select("*")
				.eq("whatsapp_jid", whatsappJid)
		);
	}

	if (userId) {
		queries.push(
			supabase
				.from("premium_entitlements")
				.select("*")
				.eq("user_id", userId)
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

	const byId = new Map();

	for (const result of results) {
		for (const row of result.data || []) {
			byId.set(row.id, row);
		}
	}

	return {
		status: "ok",
		rows: [...byId.values()],
	};
}

export function createPremiumSnapshot(result) {
	const supporter = result?.supporter || null;
	const aetherPass = result?.aetherPass || null;

	return {
		supporter: Boolean(supporter),
		aetherPass: Boolean(aetherPass),
		types: [
			...(supporter ? ["supporter"] : []),
			...(aetherPass ? ["aether_pass"] : []),
		],
		label: formatPremiumLabel({ supporter, aetherPass }),
		supporterExpiresAt: supporter?.expires_at || null,
		aetherPassExpiresAt: aetherPass?.expires_at || null,
	};
}

export function formatPremiumLabel(status) {
	const labels = [];

	if (status?.supporter) {
		labels.push("Supporter");
	}

	if (status?.aetherPass) {
		labels.push("Aether Pass");
	}

	return labels.join(" + ") || "Free";
}

export async function getPremiumStatusForIdentity({
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
	const entitlements = await queryEntitlements(supabase, {
		whatsappJid: jid,
		userId,
	});

	if (entitlements.status !== "ok") {
		return entitlements;
	}

	const supporter = pickActive(entitlements.rows, "supporter");
	const aetherPass = pickActive(entitlements.rows, "aether_pass");

	return {
		status: "ok",
		whatsappJid: jid,
		userId,
		rows: entitlements.rows,
		supporter,
		aetherPass,
		snapshot: createPremiumSnapshot({ supporter, aetherPass }),
	};
}

export async function getPremiumStatusByWhatsApp(whatsappJid) {
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

	const status = await getPremiumStatusForIdentity({
		whatsappJid: jid,
		userId: link.link?.user_id || "",
	});

	return {
		...status,
		link: link.link,
	};
}

export async function grantPremiumEntitlement({
	whatsappJid,
	type,
	days = 30,
	grantedBy = "",
	note = "",
	source = "manual",
}) {
	if (!isSupabaseConfigured()) {
		return {
			status: "not_configured",
		};
	}

	const jid = normalizeJid(whatsappJid);
	const premiumType = normalizePremiumType(type);

	if (!jid) {
		return {
			status: "invalid_jid",
		};
	}

	if (!premiumType) {
		return {
			status: "invalid_type",
		};
	}

	const safeDays = Math.max(1, Math.min(Number(days) || 30, 3650));
	const supabase = getSupabaseAdmin();
	const link = await getLinkByWhatsApp(supabase, jid);

	if (link.status !== "ok") {
		return link;
	}

	const current = await getPremiumStatusForIdentity({
		whatsappJid: jid,
		userId: link.link?.user_id || "",
	});

	if (current.status !== "ok") {
		return current;
	}

	const existing =
		premiumType === "supporter" ? current.supporter : current.aetherPass;
	const startsAt = new Date();
	const baseTime = existing?.expires_at
		? Math.max(new Date(existing.expires_at).getTime(), startsAt.getTime())
		: startsAt.getTime();
	const expiresAt = new Date(baseTime + safeDays * 86400000);
	const row = {
		user_id: link.link?.user_id || null,
		whatsapp_jid: jid,
		type: premiumType,
		status: "active",
		tier: "standard",
		cycle_key: "preseason",
		starts_at: startsAt.toISOString(),
		expires_at: expiresAt.toISOString(),
		source,
		granted_by: normalizeJid(grantedBy) || grantedBy || null,
		note: note || null,
		metadata: {
			grantedDays: safeDays,
			extendedFrom: existing?.expires_at || null,
		},
	};

	const { data, error } = await supabase
		.from("premium_entitlements")
		.insert(row)
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
		entitlement: data,
		type: PREMIUM_TYPES[premiumType],
		days: safeDays,
	};
}

export async function revokePremiumEntitlement({
	whatsappJid,
	type,
	grantedBy = "",
	note = "",
}) {
	if (!isSupabaseConfigured()) {
		return {
			status: "not_configured",
		};
	}

	const jid = normalizeJid(whatsappJid);
	const premiumType = normalizePremiumType(type);

	if (!jid) {
		return {
			status: "invalid_jid",
		};
	}

	if (!premiumType) {
		return {
			status: "invalid_type",
		};
	}

	const supabase = getSupabaseAdmin();
	const link = await getLinkByWhatsApp(supabase, jid);

	if (link.status !== "ok") {
		return link;
	}

	const updates = {
		status: "revoked",
		note: note || "revoked",
		metadata: {
			revokedBy: normalizeJid(grantedBy) || grantedBy || null,
			revokedAt: new Date().toISOString(),
		},
	};

	const queries = [
		supabase
			.from("premium_entitlements")
			.update(updates)
			.eq("whatsapp_jid", jid)
			.eq("type", premiumType)
			.eq("status", "active")
			.select("id"),
	];

	if (link.link?.user_id) {
		queries.push(
			supabase
				.from("premium_entitlements")
				.update(updates)
				.eq("user_id", link.link.user_id)
				.eq("type", premiumType)
				.eq("status", "active")
				.select("id")
		);
	}

	const results = await Promise.all(queries);
	const error = results.find((result) => result.error)?.error;

	if (error) {
		return {
			status: "error",
			error,
		};
	}

	const revoked = new Set();

	for (const result of results) {
		for (const row of result.data || []) {
			revoked.add(row.id);
		}
	}

	return {
		status: "ok",
		type: PREMIUM_TYPES[premiumType],
		revoked: revoked.size,
	};
}

function formatEntitlementLine(label, row) {
	if (!row) {
		return `${label}: *Tidak aktif*`;
	}

	return `${label}: *Aktif* (${daysLeft(row.expires_at)}, sampai ${formatDate(row.expires_at)})`;
}

export function formatPremiumStatus(result, prefix = ".") {
	const supporter = result?.supporter || null;
	const aetherPass = result?.aetherPass || null;

	return [
		"💎 *Premium Aetheria*",
		"━━━━━━━━━━━━━━━━━━━━",
		formatEntitlementLine("Supporter", supporter),
		formatEntitlementLine("Aether Pass", aetherPass),
		"",
		"🌌 *Aether Pass saat ini*",
		"Pra-Season 30 hari. Season belum aktif, jadi pass belum terikat season.",
		"",
		"🎁 *Benefit*",
		`• ${PREMIUM_TYPES.supporter.name}: ${PREMIUM_TYPES.supporter.benefits.join(", ")}`,
		`• ${PREMIUM_TYPES.aether_pass.name}: ${PREMIUM_TYPES.aether_pass.benefits.join(", ")}`,
		"",
		"💳 *Harga*",
		`• Supporter: ${PREMIUM_TYPES.supporter.price}`,
		`• Aether Pass: ${PREMIUM_TYPES.aether_pass.price}`,
		"",
		"📌 *Cara aktifkan*",
		MONETIZATION_CONFIG.paymentText,
		"",
		`Cek akun: \`${prefix}akun\``,
	].join("\n");
}

export function formatGrantResult(result) {
	return [
		"✅ *Premium Aktif*",
		"━━━━━━━━━━━━━━━━━━━━",
		`Tipe: *${result.type.name}*`,
		`Durasi: *${result.days} hari*`,
		`Berakhir: *${formatDate(result.entitlement.expires_at)}*`,
	].join("\n");
}

export function formatRevokeResult(result) {
	return [
		"✅ *Premium Dicabut*",
		"━━━━━━━━━━━━━━━━━━━━",
		`Tipe: *${result.type.name}*`,
		`Row dicabut: *${result.revoked}*`,
	].join("\n");
}
