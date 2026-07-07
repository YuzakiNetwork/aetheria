import { isSupabaseConfigured } from "#config/supabase";
import { getSupabaseAdmin } from "#lib/supabase/client";
import { randomBytes } from "node:crypto";

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

function cleanName(name, fallback = "Aether Squad") {
	return (
		String(name || fallback)
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, 32) || fallback
	);
}

function createCode() {
	return randomBytes(3).toString("hex").toUpperCase();
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

async function getActiveMemberByWhatsApp(supabase, whatsappJid) {
	const { data, error } = await supabase
		.from("squad_members")
		.select("*")
		.eq("whatsapp_jid", whatsappJid)
		.eq("status", "active")
		.maybeSingle();

	if (error) {
		return {
			status: "error",
			error,
		};
	}

	return {
		status: "ok",
		member: data || null,
	};
}

async function getSquadDetails(supabase, squadId) {
	const [
		{ data: squad, error: squadError },
		{ data: members, error: memberError },
	] = await Promise.all([
		supabase
			.from("squads")
			.select("*")
			.eq("id", squadId)
			.eq("status", "active")
			.maybeSingle(),
		supabase
			.from("squad_members")
			.select("*")
			.eq("squad_id", squadId)
			.eq("status", "active")
			.order("joined_at", { ascending: true }),
	]);

	const error = squadError || memberError;

	if (error) {
		return {
			status: "error",
			error,
		};
	}

	if (!squad) {
		return {
			status: "missing",
		};
	}

	return {
		status: "ok",
		squad,
		members: members || [],
	};
}

export async function getSquadForIdentity({
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
	let member = null;

	if (jid) {
		const result = await getActiveMemberByWhatsApp(supabase, jid);

		if (result.status !== "ok") {
			return result;
		}

		member = result.member;
	}

	if (!member && userId) {
		const { data, error } = await supabase
			.from("squad_members")
			.select("*")
			.eq("user_id", userId)
			.eq("status", "active")
			.maybeSingle();

		if (error) {
			return {
				status: "error",
				error,
			};
		}

		member = data || null;
	}

	if (!member) {
		return {
			status: "missing",
		};
	}

	return getSquadDetails(supabase, member.squad_id);
}

export async function getSquadByWhatsApp(whatsappJid) {
	return getSquadForIdentity({
		whatsappJid,
	});
}

export async function createSquad({
	whatsappJid,
	displayName = "",
	name = "",
}) {
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
	const active = await getActiveMemberByWhatsApp(supabase, jid);

	if (active.status !== "ok") {
		return active;
	}

	if (active.member) {
		const details = await getSquadDetails(supabase, active.member.squad_id);

		return {
			...details,
			status: "already_in_squad",
		};
	}

	const link = await getLinkByWhatsApp(supabase, jid);

	if (link.status !== "ok") {
		return link;
	}

	let squad = null;
	let squadError = null;

	for (let attempt = 0; attempt < 4; attempt += 1) {
		const { data, error } = await supabase
			.from("squads")
			.insert({
				code: createCode(),
				name: cleanName(name, `${displayName || "Aether"} Squad`),
				leader_whatsapp_jid: jid,
				leader_user_id: link.link?.user_id || null,
				status: "active",
				max_members: 4,
			})
			.select("*")
			.single();

		if (!error) {
			squad = data;
			break;
		}

		squadError = error;
	}

	if (!squad) {
		return {
			status: "error",
			error: squadError,
		};
	}

	const { error: memberError } = await supabase.from("squad_members").insert({
		squad_id: squad.id,
		user_id: link.link?.user_id || null,
		whatsapp_jid: jid,
		display_name: link.link?.display_name || displayName || "",
		role: "leader",
		status: "active",
	});

	if (memberError) {
		await supabase
			.from("squads")
			.update({ status: "disbanded" })
			.eq("id", squad.id);

		return {
			status: "error",
			error: memberError,
		};
	}

	const details = await getSquadDetails(supabase, squad.id);

	return {
		status: "ok",
		...details,
	};
}

export async function joinSquad({ whatsappJid, displayName = "", code = "" }) {
	if (!isSupabaseConfigured()) {
		return {
			status: "not_configured",
		};
	}

	const jid = normalizeJid(whatsappJid);
	const normalizedCode = String(code || "")
		.trim()
		.toUpperCase();

	if (!jid) {
		return {
			status: "invalid_jid",
		};
	}

	if (!normalizedCode) {
		return {
			status: "invalid_code",
		};
	}

	const supabase = getSupabaseAdmin();
	const active = await getActiveMemberByWhatsApp(supabase, jid);

	if (active.status !== "ok") {
		return active;
	}

	if (active.member) {
		const details = await getSquadDetails(supabase, active.member.squad_id);

		return {
			...details,
			status: "already_in_squad",
		};
	}

	const { data: squad, error: squadError } = await supabase
		.from("squads")
		.select("*")
		.eq("code", normalizedCode)
		.eq("status", "active")
		.maybeSingle();

	if (squadError) {
		return {
			status: "error",
			error: squadError,
		};
	}

	if (!squad) {
		return {
			status: "missing_squad",
		};
	}

	const details = await getSquadDetails(supabase, squad.id);

	if (details.status !== "ok") {
		return details;
	}

	if (details.members.length >= squad.max_members) {
		return {
			status: "full",
			...details,
		};
	}

	const link = await getLinkByWhatsApp(supabase, jid);

	if (link.status !== "ok") {
		return link;
	}

	const { error: memberError } = await supabase.from("squad_members").insert({
		squad_id: squad.id,
		user_id: link.link?.user_id || null,
		whatsapp_jid: jid,
		display_name: link.link?.display_name || displayName || "",
		role: "member",
		status: "active",
	});

	if (memberError) {
		return {
			status: "error",
			error: memberError,
		};
	}

	return {
		status: "ok",
		...(await getSquadDetails(supabase, squad.id)),
	};
}

export async function leaveSquad(whatsappJid) {
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
	const active = await getActiveMemberByWhatsApp(supabase, jid);

	if (active.status !== "ok") {
		return active;
	}

	if (!active.member) {
		return {
			status: "missing",
		};
	}

	const details = await getSquadDetails(supabase, active.member.squad_id);

	if (active.member.role === "leader") {
		await Promise.all([
			supabase
				.from("squads")
				.update({ status: "disbanded" })
				.eq("id", active.member.squad_id),
			supabase
				.from("squad_members")
				.update({ status: "left" })
				.eq("squad_id", active.member.squad_id)
				.eq("status", "active"),
		]);

		return {
			status: "disbanded",
			...details,
		};
	}

	const { error } = await supabase
		.from("squad_members")
		.update({ status: "left" })
		.eq("id", active.member.id);

	if (error) {
		return {
			status: "error",
			error,
		};
	}

	return {
		status: "left",
		...details,
	};
}

export function formatSquadStatus(result, prefix = ".") {
	if (!result || result.status === "missing") {
		return [
			"👥 *Squad Aetheria*",
			"━━━━━━━━━━━━━━━━━━━━",
			"Belum punya squad.",
			"",
			`Buat squad: \`${prefix}squad buat Nama Squad\``,
			`Join squad: \`${prefix}squad join KODE\``,
			"",
			`Dungeon: \`${prefix}dungeon\` setelah punya squad.`,
		].join("\n");
	}

	const members = result.members || [];

	return [
		"👥 *Squad Aetheria*",
		"━━━━━━━━━━━━━━━━━━━━",
		`Nama: *${result.squad.name}*`,
		`Kode: *${result.squad.code}*`,
		`Member: *${members.length}/${result.squad.max_members}*`,
		"",
		"*Anggota*",
		...members.map((member, index) => {
			const icon = member.role === "leader" ? "👑" : "•";
			return `${icon} ${index + 1}. ${member.display_name || member.whatsapp_jid.replace(/@.+$/, "")}`;
		}),
		"",
		`Bagikan kode: \`${prefix}squad join ${result.squad.code}\``,
		`Dungeon: \`${prefix}dungeon\``,
		`Keluar: \`${prefix}squad leave\``,
	].join("\n");
}

export function formatSquadCreateResult(result, prefix = ".") {
	return [
		"✅ *Squad Dibuat*",
		"━━━━━━━━━━━━━━━━━━━━",
		formatSquadStatus(result, prefix),
	].join("\n");
}

export function formatSquadJoinResult(result, prefix = ".") {
	return [
		result.status === "already_in_squad"
			? "📌 *Sudah Masuk Squad*"
			: "✅ *Berhasil Join Squad*",
		"━━━━━━━━━━━━━━━━━━━━",
		formatSquadStatus(result, prefix),
	].join("\n");
}

export function formatSquadLeaveResult(result) {
	if (result.status === "disbanded") {
		return "👥 Squad dibubarkan karena leader keluar.";
	}

	return "👥 Kamu keluar dari squad.";
}
