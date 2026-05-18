import { isSupabaseConfigured } from "#config/supabase";
import { getSupabaseAdmin } from "#lib/supabase/client";
import { getGuildStatusForIdentity } from "#lib/supabase/guilds";
import { getPremiumStatusForIdentity } from "#lib/supabase/monetization";
import { getSquadForIdentity } from "#lib/supabase/squads";

function normalizeJid(jid) {
	return String(jid || "").trim();
}

function toIso(value = Date.now()) {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return new Date().toISOString();
	}

	return date.toISOString();
}

async function detachOtherRpgRowsForUser(supabase, userId, keepJid = "") {
	const jid = normalizeJid(keepJid);

	if (!userId || !jid) {
		return null;
	}

	const { error: activeError } = await supabase
		.from("rpg_players")
		.update({
			user_id: null,
			whatsapp_jid: null,
		})
		.eq("user_id", userId)
		.neq("whatsapp_jid", jid);

	if (activeError) {
		return activeError;
	}

	const { error: detachedError } = await supabase
		.from("rpg_players")
		.update({
			user_id: null,
		})
		.eq("user_id", userId)
		.is("whatsapp_jid", null);

	return detachedError || null;
}

export async function syncRpgProfileSnapshot(whatsappJid, snapshot) {
	if (!isSupabaseConfigured()) {
		return {
			status: "not_configured",
		};
	}

	const jid = normalizeJid(whatsappJid);

	if (!jid || !snapshot) {
		return {
			status: "skipped",
		};
	}

	try {
		const supabase = getSupabaseAdmin();
		const { data: link, error: linkError } = await supabase
			.from("whatsapp_links")
			.select("user_id, display_name")
			.eq("whatsapp_jid", jid)
			.maybeSingle();

		if (linkError) {
			return {
				status: "error",
				error: linkError,
			};
		}

		if (link?.user_id) {
			const detachError = await detachOtherRpgRowsForUser(
				supabase,
				link.user_id,
				jid
			);

			if (detachError) {
				return {
					status: "error",
					error: detachError,
				};
			}
		}

		const row = {
			whatsapp_jid: jid,
			user_id: link?.user_id || null,
			display_name: link?.display_name || snapshot.characterName || "",
			character_name: snapshot.characterName,
			class_key: snapshot.classKey,
			class_name: snapshot.className,
			level: snapshot.level,
			xp: snapshot.xp,
			xp_next: snapshot.xpNext,
			gold: snapshot.gold,
			hp: snapshot.hp,
			max_hp: snapshot.maxHp,
			energy: snapshot.energy,
			max_energy: snapshot.maxEnergy,
			attack: snapshot.attack,
			defense: snapshot.defense,
			agility: snapshot.agility,
			wins: snapshot.wins,
			losses: snapshot.losses,
			jobs: snapshot.jobs,
			zone_name: snapshot.zoneName,
			gear: snapshot.gear,
			items: snapshot.items,
			raw_player: snapshot.rawPlayer || {},
			snapshot,
			synced_at: toIso(snapshot.updatedAt),
		};

		const { error } = await supabase.from("rpg_players").upsert(row, {
			onConflict: "whatsapp_jid",
		});

		if (!error && link?.user_id) {
			await supabase.from("rpg_profiles").upsert(
				{
					user_id: link.user_id,
					whatsapp_jid: jid,
					character_name: snapshot.characterName,
					class_key: snapshot.classKey,
					class_name: snapshot.className,
					level: snapshot.level,
					xp: snapshot.xp,
					xp_next: snapshot.xpNext,
					gold: snapshot.gold,
					hp: snapshot.hp,
					max_hp: snapshot.maxHp,
					energy: snapshot.energy,
					max_energy: snapshot.maxEnergy,
					attack: snapshot.attack,
					defense: snapshot.defense,
					agility: snapshot.agility,
					wins: snapshot.wins,
					losses: snapshot.losses,
					jobs: snapshot.jobs,
					zone_name: snapshot.zoneName,
					gear: snapshot.gear,
					items: snapshot.items,
					raw_player: snapshot.rawPlayer || {},
					snapshot,
					synced_at: toIso(snapshot.updatedAt),
				},
				{
					onConflict: "user_id",
				}
			);
		}

		if (error) {
			return {
				status: "error",
				error,
			};
		}

		return {
			status: "ok",
			userId: link?.user_id || null,
			linked: Boolean(link?.user_id),
		};
	} catch (error) {
		return {
			status: "error",
			error,
		};
	}
}

export async function getRpgPlayerByWhatsApp(whatsappJid) {
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
	const { data, error } = await supabase
		.from("rpg_players")
		.select("display_name, raw_player, synced_at, user_id")
		.eq("whatsapp_jid", jid)
		.maybeSingle();

	if (error) {
		return {
			status: "error",
			error,
		};
	}

	if (!data) {
		return {
			status: "missing",
		};
	}

	if (!data.raw_player || !Object.keys(data.raw_player).length) {
		return {
			status: "empty",
			profile: data,
		};
	}

	return {
		status: "ok",
		profile: data,
		player: data.raw_player,
	};
}

export async function getRpgLeaderboard(limit = 10) {
	if (!isSupabaseConfigured()) {
		return {
			status: "not_configured",
			entries: [],
		};
	}

	const supabase = getSupabaseAdmin();
	const { data, error } = await supabase
		.from("rpg_players")
		.select(
			"whatsapp_jid, display_name, character_name, level, xp, gold, raw_player"
		)
		.order("level", { ascending: false })
		.order("xp", { ascending: false })
		.order("gold", { ascending: false })
		.limit(Math.max(1, Math.min(Number(limit) || 10, 50)));

	if (error) {
		return {
			status: "error",
			error,
			entries: [],
		};
	}

	return {
		status: "ok",
		entries: (data || []).map((row) => ({
			userId: row.whatsapp_jid,
			name: row.character_name || row.display_name || "Adventurer",
			player: row.raw_player,
		})),
	};
}

export async function migrateLegacyRpgProfileToPlayer(whatsappJid, snapshot) {
	return syncRpgProfileSnapshot(whatsappJid, snapshot);
}

export async function syncLegacyLinkedRpgProfile(whatsappJid, snapshot) {
	if (!isSupabaseConfigured()) {
		return {
			status: "not_configured",
		};
	}

	const jid = normalizeJid(whatsappJid);
	const supabase = getSupabaseAdmin();
	const { data: link } = await supabase
		.from("whatsapp_links")
		.select("user_id")
		.eq("whatsapp_jid", jid)
		.maybeSingle();

	if (!link?.user_id) {
		return {
			status: "not_linked",
		};
	}

	const { error } = await supabase.from("rpg_profiles").upsert(
		{
			user_id: link.user_id,
			whatsapp_jid: jid,
			character_name: snapshot.characterName,
			class_key: snapshot.classKey,
			class_name: snapshot.className,
			level: snapshot.level,
			xp: snapshot.xp,
			xp_next: snapshot.xpNext,
			gold: snapshot.gold,
			hp: snapshot.hp,
			max_hp: snapshot.maxHp,
			energy: snapshot.energy,
			max_energy: snapshot.maxEnergy,
			attack: snapshot.attack,
			defense: snapshot.defense,
			agility: snapshot.agility,
			wins: snapshot.wins,
			losses: snapshot.losses,
			jobs: snapshot.jobs,
			zone_name: snapshot.zoneName,
			gear: snapshot.gear,
			items: snapshot.items,
			raw_player: snapshot.rawPlayer || {},
			snapshot,
			synced_at: toIso(snapshot.updatedAt),
		},
		{
			onConflict: "user_id",
		}
	);

	if (error) {
		return {
			status: "error",
			error,
		};
	}

	return {
		status: "ok",
		userId: link.user_id,
	};
}

export async function getCloudRpgProfileByUserId(userId) {
	if (!isSupabaseConfigured()) {
		return {
			status: "not_configured",
		};
	}

	if (!userId) {
		return {
			status: "invalid_request",
		};
	}

	const supabase = getSupabaseAdmin();
	const { data, error } = await supabase
		.from("rpg_players")
		.select(
			"character_name, class_name, level, xp, gold, raw_player, synced_at"
		)
		.eq("user_id", userId)
		.maybeSingle();

	if (error) {
		return {
			status: "error",
			error,
		};
	}

	if (!data) {
		return {
			status: "missing",
		};
	}

	if (!data.raw_player || !Object.keys(data.raw_player).length) {
		return {
			status: "empty",
			profile: data,
		};
	}

	return {
		status: "ok",
		profile: data,
		player: data.raw_player,
	};
}

export async function getDashboardData(accessToken) {
	if (!isSupabaseConfigured()) {
		return {
			status: "not_configured",
		};
	}

	if (!accessToken) {
		return {
			status: "unauthorized",
		};
	}

	const supabase = getSupabaseAdmin();
	const { data: authData, error: authError } =
		await supabase.auth.getUser(accessToken);

	if (authError || !authData?.user) {
		return {
			status: "unauthorized",
			error: authError,
		};
	}

	const user = authData.user;
	const [
		{ data: profile, error: profileError },
		{ data: link, error: linkError },
		{ data: rpg, error: rpgError },
	] = await Promise.all([
		supabase
			.from("profiles")
			.select("email, display_name, avatar_url, updated_at")
			.eq("id", user.id)
			.maybeSingle(),
		supabase
			.from("whatsapp_links")
			.select("whatsapp_jid, display_name, linked_at")
			.eq("user_id", user.id)
			.maybeSingle(),
		supabase
			.from("rpg_players")
			.select(
				"character_name, class_key, class_name, level, xp, xp_next, gold, hp, max_hp, energy, max_energy, attack, defense, agility, wins, losses, jobs, zone_name, gear, items, snapshot, synced_at"
			)
			.eq("user_id", user.id)
			.order("synced_at", { ascending: false })
			.limit(1)
			.maybeSingle(),
	]);

	const error = profileError || linkError || rpgError;

	if (error) {
		return {
			status: "error",
			error,
		};
	}

	const [premium, guild, squad] = await Promise.all([
		getPremiumStatusForIdentity({
			userId: user.id,
			whatsappJid: link?.whatsapp_jid || "",
		}),
		getGuildStatusForIdentity({
			userId: user.id,
			whatsappJid: link?.whatsapp_jid || "",
		}),
		getSquadForIdentity({
			userId: user.id,
			whatsappJid: link?.whatsapp_jid || "",
		}),
	]);

	return {
		status: "ok",
		user: {
			id: user.id,
			email: user.email,
		},
		profile,
		link,
		rpg,
		premium: premium.status === "ok" ? premium.snapshot : null,
		guild:
			guild.status === "ok"
				? {
						label: guild.label,
						memberships: Object.keys(guild.memberships || {}),
					}
				: null,
		squad:
			squad.status === "ok"
				? {
						name: squad.squad.name,
						code: squad.squad.code,
						memberCount: squad.members.length,
						maxMembers: squad.squad.max_members,
					}
				: null,
	};
}
