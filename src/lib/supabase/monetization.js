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

export const SUPPORT_PACKAGES = [
	{
		key: "supporter",
		name: "Supporter",
		price: MONETIZATION_CONFIG.supporterPrice,
		command: "grantpremium supporter 30 <nomor>",
		description:
			"Untuk user yang ingin bantu biaya server tanpa efek pay-to-win.",
		benefits: [
			"Badge Supporter di profil RPG",
			"Nama masuk supporter wall",
			"Title kosmetik supporter",
			"Prioritas ikut voting update komunitas",
		],
	},
	{
		key: "aether_pass",
		name: "Aether Pass",
		price: MONETIZATION_CONFIG.aetherPassPrice,
		command: "grantpremium pass 30 <nomor>",
		description:
			"Pass pra-season untuk kosmetik dan akses komunitas saat fitur premium siap.",
		benefits: [
			"Badge Aether Pass Pra-Season",
			"Benefit supporter ikut aktif",
			"Kosmetik pra-season saat dirilis",
			"Nama lebih menonjol di dashboard",
		],
	},
	{
		key: "sponsor",
		name: "Sponsor Board",
		price: "Mulai Rp25.000/update",
		command: "sponsor",
		description:
			"Slot sponsor ringan untuk grup, channel, atau komunitas partner.",
		benefits: [
			"Nama sponsor di command sponsor/update tertentu",
			"Teks promosi singkat yang tidak mengganggu chat",
			"Cocok untuk grup, channel, atau event komunitas",
			"Bisa dibuat periodik tanpa spam mass mention",
		],
	},
];

export const SPONSOR_SLOTS = [
	{
		key: "update_footer",
		name: "Update Footer",
		price: "Rp25.000 / 1 update",
		description:
			"Nama sponsor tampil di footer teks update yang dikirim ke channel/grup.",
	},
	{
		key: "status_card",
		name: "Status Card",
		price: "Rp35.000 / 7 hari",
		description:
			"Nama sponsor tampil ringan di command .status atau halaman support.",
	},
	{
		key: "community_quest",
		name: "Community Quest",
		price: "Rp50.000 / event",
		description:
			"Quest komunitas transparan dengan reward kecil, tanpa pay-to-win.",
	},
];

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

function normalizeAmount(value) {
	const numeric = Number(String(value || "").replace(/[^\d]/g, ""));

	return Number.isFinite(numeric) ? numeric : 0;
}

function formatCurrency(value) {
	return new Intl.NumberFormat("id-ID", {
		currency: "IDR",
		maximumFractionDigits: 0,
		style: "currency",
	}).format(Math.max(0, Number(value) || 0));
}

function operatingProgress() {
	const current = normalizeAmount(MONETIZATION_CONFIG.currentSupport);
	const target = normalizeAmount(MONETIZATION_CONFIG.monthlyTarget);
	const percent = target
		? Math.min(100, Math.round((current / target) * 100))
		: 0;

	return {
		current,
		currentLabel:
			current > 0
				? formatCurrency(current)
				: MONETIZATION_CONFIG.currentSupport,
		percent,
		target,
		targetLabel:
			target > 0
				? formatCurrency(target)
				: MONETIZATION_CONFIG.monthlyTarget,
	};
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

export async function getSupporterWall({ limit = 12 } = {}) {
	if (!isSupabaseConfigured()) {
		return {
			status: "not_configured",
		};
	}

	const safeLimit = Math.max(1, Math.min(Number(limit) || 12, 50));
	const supabase = getSupabaseAdmin();
	const { data, error } = await supabase
		.from("premium_entitlements")
		.select("whatsapp_jid, type, starts_at, expires_at, note, status")
		.eq("type", "supporter")
		.eq("status", "active")
		.order("starts_at", { ascending: false })
		.limit(safeLimit);

	if (error) {
		return {
			status: "error",
			error,
		};
	}

	return {
		status: "ok",
		supporters: (data || []).filter(isActive),
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

export function formatDonationMessage(prefix = ".") {
	const progress = operatingProgress();
	const paymentUrl = MONETIZATION_CONFIG.paymentUrl;
	const supportUrl = MONETIZATION_CONFIG.supportPageUrl;
	const paymentLines = MONETIZATION_CONFIG.paymentText
		.split(/\\n|\n/g)
		.map((line) => line.trim())
		.filter(Boolean);

	return [
		"💎 *Dukung Operasional Aetheria*",
		"━━━━━━━━━━━━━━━━━━━━",
		"Aetheria tetap gratis. Donasi dipakai untuk server, panel, domain/website, storage session, dan eksperimen fitur baru.",
		"",
		"📊 *Target Bulanan*",
		`Terkumpul: *${progress.currentLabel || "-"}*`,
		`Target: *${progress.targetLabel || "-"}*`,
		`Progress: *${progress.percent}%*`,
		"",
		"🎁 *Paket Support*",
		...SUPPORT_PACKAGES.filter((item) => item.key !== "sponsor").map(
			(item) => `• *${item.name}* - ${item.price}\n  ${item.description}`
		),
		"",
		"📌 *Cara Support*",
		...(paymentLines.length
			? paymentLines
			: ["Hubungi owner untuk aktivasi manual."]),
		...(paymentUrl ? [`Link bayar: ${paymentUrl}`] : []),
		"",
		"✅ *Klaim Badge*",
		"Kirim bukti ke owner, lalu owner akan langsung mengaktifkan",
		`Owner: ${prefix}grantpremium supporter 30 <nomor>`,
		"",
		"🔎 *Command*",
		`• ${prefix}supporter - cek status`,
		`• ${prefix}donasi wall - lihat supporter wall`,
		`• ${prefix}sponsor - lihat slot sponsor`,
		"",
		"*Website*",
		supportUrl || "-",
	].join("\n");
}

export function formatSponsorMessage(prefix = ".") {
	return [
		"📣 *Sponsor Board Aetheria*",
		"━━━━━━━━━━━━━━━━━━━━",
		"Sponsor dibuat ringan dan transparan. Tidak ada spam mass mention, tidak jual data user, dan tidak mengganggu loop RPG.",
		"",
		"*Slot Tersedia*",
		...SPONSOR_SLOTS.map(
			(slot) => `• *${slot.name}* - ${slot.price}\n  ${slot.description}`
		),
		"",
		"*Aturan*",
		"• Konten aman untuk komunitas.",
		"• Link grup/channel boleh, tapi tidak boleh phishing, judi, atau scam.",
		"• Reward sponsor quest harus kecil dan tidak pay-to-win.",
		"",
		"*Minat Sponsor?*",
		MONETIZATION_CONFIG.sponsorContact ||
			MONETIZATION_CONFIG.paymentText ||
			"Hubungi owner Aetheria.",
		"",
		`Cek donasi: ${prefix}donasi`,
	].join("\n");
}

export function formatSupporterWall(result, prefix = ".") {
	if (result.status === "not_configured") {
		return [
			"💎 *Supporter Wall*",
			"━━━━━━━━━━━━━━━━━━━━",
			"Supporter wall butuh Supabase aktif.",
			"",
			`Cek cara support: ${prefix}donasi`,
		].join("\n");
	}

	if (result.status !== "ok") {
		return `Gagal memuat supporter wall: ${result.error?.message || result.status}`;
	}

	const rows = result.supporters || [];

	if (!rows.length) {
		return [
			"💎 *Supporter Wall*",
			"━━━━━━━━━━━━━━━━━━━━",
			"Belum ada supporter aktif bulan ini.",
			"",
			`Jadi yang pertama: ${prefix}donasi`,
		].join("\n");
	}

	return [
		"💎 *Supporter Wall*",
		"━━━━━━━━━━━━━━━━━━━━",
		...rows.map((row, index) => {
			const number = row.whatsapp_jid.replace(/\D/g, "");
			const masked = number
				? `${number.slice(0, 5)}••••${number.slice(-3)}`
				: "Aether";
			return `${index + 1}. ${masked} - ${daysLeft(row.expires_at)}`;
		}),
		"",
		`Dukung juga: ${prefix}donasi`,
	].join("\n");
}

export function getSupportPageData() {
	return {
		packages: SUPPORT_PACKAGES,
		paymentText: MONETIZATION_CONFIG.paymentText,
		paymentUrl: MONETIZATION_CONFIG.paymentUrl,
		progress: operatingProgress(),
		sponsorContact: MONETIZATION_CONFIG.sponsorContact,
		sponsorSlots: SPONSOR_SLOTS,
		supportPageUrl: MONETIZATION_CONFIG.supportPageUrl,
	};
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
