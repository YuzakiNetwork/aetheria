import { SUPABASE_CONFIG, isSupabaseConfigured } from "#config/supabase";
import { getSupabaseAdmin } from "#lib/supabase/client";
import { createHash, randomBytes } from "node:crypto";

function hashToken(token) {
	return createHash("sha256").update(token).digest("hex");
}

function normalizeJid(jid) {
	return String(jid || "").trim();
}

function getUserDisplayName(user, fallback = "") {
	const metadata = user?.user_metadata || {};

	return (
		metadata.full_name ||
		metadata.name ||
		metadata.preferred_username ||
		fallback ||
		""
	);
}

function getUserAvatar(user) {
	const metadata = user?.user_metadata || {};

	return metadata.avatar_url || metadata.picture || null;
}

export function isAccountLinkingReady() {
	return isSupabaseConfigured();
}

function normalizePurpose(purpose) {
	return purpose === "restore" ? "restore" : "link";
}

async function detachOtherRpgRowsForUser(supabase, userId, keepJid = "") {
	const jid = normalizeJid(keepJid);

	if (!userId) {
		return null;
	}

	if (jid) {
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

async function bindWhatsAppToUserWithClient(
	supabase,
	userId,
	whatsappJid,
	displayName = ""
) {
	const jid = normalizeJid(whatsappJid);

	if (!userId || !jid) {
		return {
			status: "invalid_request",
		};
	}

	const { data: currentPlayer, error: currentPlayerError } = await supabase
		.from("rpg_players")
		.select("id, user_id, whatsapp_jid")
		.eq("whatsapp_jid", jid)
		.maybeSingle();

	if (currentPlayerError) {
		return {
			status: "error",
			error: currentPlayerError,
		};
	}

	const { data: cloudPlayer, error: cloudPlayerError } = await supabase
		.from("rpg_players")
		.select("id, user_id, whatsapp_jid")
		.eq("user_id", userId)
		.order("synced_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	if (cloudPlayerError) {
		return {
			status: "error",
			error: cloudPlayerError,
		};
	}

	const { error: oldJidError } = await supabase
		.from("whatsapp_links")
		.delete()
		.eq("whatsapp_jid", jid);

	if (oldJidError) {
		return {
			status: "error",
			error: oldJidError,
		};
	}

	const { error: oldUserError } = await supabase
		.from("whatsapp_links")
		.delete()
		.eq("user_id", userId);

	if (oldUserError) {
		return {
			status: "error",
			error: oldUserError,
		};
	}

	const { error: linkError } = await supabase.from("whatsapp_links").insert({
		user_id: userId,
		whatsapp_jid: jid,
		display_name: displayName || "",
		linked_at: new Date().toISOString(),
	});

	if (linkError) {
		return {
			status: "error",
			error: linkError,
		};
	}

	const keepJid = currentPlayer ? jid : cloudPlayer?.whatsapp_jid || "";
	const detachError = await detachOtherRpgRowsForUser(
		supabase,
		userId,
		keepJid
	);

	if (detachError) {
		return {
			status: "error",
			error: detachError,
		};
	}

	let playerLinkError = null;

	if (currentPlayer) {
		({ error: playerLinkError } = await supabase
			.from("rpg_players")
			.update({
				user_id: userId,
				display_name: displayName || "",
			})
			.eq("id", currentPlayer.id));
	} else if (cloudPlayer) {
		({ error: playerLinkError } = await supabase
			.from("rpg_players")
			.update({
				whatsapp_jid: jid,
				display_name: displayName || "",
			})
			.eq("id", cloudPlayer.id));
	}

	if (playerLinkError) {
		return {
			status: "error",
			error: playerLinkError,
		};
	}

	const { error: legacyProfileError } = await supabase
		.from("rpg_profiles")
		.update({
			whatsapp_jid: jid,
		})
		.eq("user_id", userId);

	if (legacyProfileError) {
		return {
			status: "error",
			error: legacyProfileError,
		};
	}

	return {
		status: "ok",
	};
}

export async function bindWhatsAppToUser(
	userId,
	whatsappJid,
	displayName = ""
) {
	if (!isAccountLinkingReady()) {
		return {
			status: "not_configured",
		};
	}

	return bindWhatsAppToUserWithClient(
		getSupabaseAdmin(),
		userId,
		whatsappJid,
		displayName
	);
}

export async function createAccountLinkSession(
	whatsappJid,
	displayName = "",
	purpose = "link"
) {
	if (!isAccountLinkingReady()) {
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

	const token = randomBytes(32).toString("base64url");
	const tokenHash = hashToken(token);
	const expiresAt = new Date(
		Date.now() + SUPABASE_CONFIG.linkTokenTtlMinutes * 60 * 1000
	).toISOString();
	const supabase = getSupabaseAdmin();

	const { error } = await supabase.from("account_link_tokens").insert({
		token_hash: tokenHash,
		whatsapp_jid: jid,
		display_name: displayName || "",
		purpose: normalizePurpose(purpose),
		expires_at: expiresAt,
	});

	if (error) {
		return {
			status: "error",
			error,
		};
	}

	const link = new URL("/link", SUPABASE_CONFIG.publicUrl);
	link.searchParams.set("token", token);

	return {
		status: "ok",
		link: link.toString(),
		expiresAt,
	};
}

export async function getAccountLinkByToken(token) {
	if (!isAccountLinkingReady()) {
		return {
			status: "not_configured",
		};
	}

	const tokenHash = hashToken(token);
	const supabase = getSupabaseAdmin();
	const { data, error } = await supabase
		.from("account_link_tokens")
		.select(
			"token_hash, whatsapp_jid, display_name, purpose, expires_at, used_at, completed_user_id, completed_at, restored_at"
		)
		.eq("token_hash", tokenHash)
		.maybeSingle();

	if (error) {
		return {
			status: "error",
			error,
		};
	}

	if (!data) {
		return {
			status: "not_found",
		};
	}

	if (data.used_at) {
		return {
			status: "used",
			link: data,
		};
	}

	if (new Date(data.expires_at).getTime() <= Date.now()) {
		return {
			status: "expired",
			link: data,
		};
	}

	return {
		status: "ok",
		link: data,
	};
}

export async function completeAccountLink(token, accessToken) {
	if (!isAccountLinkingReady()) {
		return {
			status: "not_configured",
		};
	}

	if (!token || !accessToken) {
		return {
			status: "invalid_request",
		};
	}

	const linkResult = await getAccountLinkByToken(token);

	if (linkResult.status !== "ok") {
		return linkResult;
	}

	const supabase = getSupabaseAdmin();
	const { data: authData, error: authError } =
		await supabase.auth.getUser(accessToken);

	if (authError || !authData?.user) {
		return {
			status: "invalid_session",
			error: authError,
		};
	}

	const user = authData.user;
	const email = user.email || "";
	const displayName = getUserDisplayName(user, linkResult.link.display_name);
	const avatarUrl = getUserAvatar(user);
	const purpose = normalizePurpose(linkResult.link.purpose);

	const { error: profileError } = await supabase.from("profiles").upsert({
		id: user.id,
		email,
		display_name: displayName,
		avatar_url: avatarUrl,
	});

	if (profileError) {
		return {
			status: "error",
			error: profileError,
		};
	}

	if (purpose === "restore") {
		const { error: restoreTokenError } = await supabase
			.from("account_link_tokens")
			.update({
				used_at: new Date().toISOString(),
				completed_at: new Date().toISOString(),
				completed_user_id: user.id,
			})
			.eq("token_hash", linkResult.link.token_hash);

		if (restoreTokenError) {
			return {
				status: "error",
				error: restoreTokenError,
			};
		}

		return {
			status: "ok",
			action: "restore_ready",
			user: {
				id: user.id,
				email,
				displayName,
				avatarUrl,
			},
			whatsappJid: linkResult.link.whatsapp_jid,
		};
	}

	const bindResult = await bindWhatsAppToUserWithClient(
		supabase,
		user.id,
		linkResult.link.whatsapp_jid,
		linkResult.link.display_name || displayName
	);

	if (bindResult.status !== "ok") {
		return bindResult;
	}

	const { error: tokenError } = await supabase
		.from("account_link_tokens")
		.update({ used_at: new Date().toISOString() })
		.eq("token_hash", linkResult.link.token_hash);

	if (tokenError) {
		return {
			status: "error",
			error: tokenError,
		};
	}

	return {
		status: "ok",
		action: "linked",
		user: {
			id: user.id,
			email,
			displayName,
			avatarUrl,
		},
		whatsappJid: linkResult.link.whatsapp_jid,
	};
}

export async function unlinkWhatsAppAccount(whatsappJid) {
	if (!isAccountLinkingReady()) {
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
	const linkResult = await getLinkedAccountByWhatsApp(jid);

	if (linkResult.status !== "ok") {
		return linkResult;
	}

	const { data: currentPlayer, error: currentPlayerError } = await supabase
		.from("rpg_players")
		.select("id")
		.eq("whatsapp_jid", jid)
		.maybeSingle();

	if (currentPlayerError) {
		return {
			status: "error",
			error: currentPlayerError,
		};
	}

	if (currentPlayer) {
		const detachOtherError = await detachOtherRpgRowsForUser(
			supabase,
			linkResult.link.user_id,
			jid
		);

		if (detachOtherError) {
			return {
				status: "error",
				error: detachOtherError,
			};
		}

		const { error: playerDetachError } = await supabase
			.from("rpg_players")
			.update({
				whatsapp_jid: null,
				user_id: linkResult.link.user_id,
				display_name:
					linkResult.link.display_name ||
					linkResult.profile?.display_name ||
					"",
			})
			.eq("id", currentPlayer.id);

		if (playerDetachError) {
			return {
				status: "error",
				error: playerDetachError,
			};
		}
	}

	const { error: legacyDetachError } = await supabase
		.from("rpg_profiles")
		.update({
			whatsapp_jid: null,
		})
		.eq("user_id", linkResult.link.user_id);

	if (legacyDetachError) {
		return {
			status: "error",
			error: legacyDetachError,
		};
	}

	const { error } = await supabase
		.from("whatsapp_links")
		.delete()
		.eq("whatsapp_jid", jid);

	if (error) {
		return {
			status: "error",
			error,
		};
	}

	return {
		status: "ok",
		link: linkResult.link,
		profile: linkResult.profile,
	};
}

export async function getLatestCompletedRestoreSession(whatsappJid) {
	if (!isAccountLinkingReady()) {
		return {
			status: "not_configured",
		};
	}

	const jid = normalizeJid(whatsappJid);
	const supabase = getSupabaseAdmin();
	const { data, error } = await supabase
		.from("account_link_tokens")
		.select(
			"token_hash, whatsapp_jid, display_name, completed_user_id, completed_at, restored_at"
		)
		.eq("whatsapp_jid", jid)
		.eq("purpose", "restore")
		.not("used_at", "is", null)
		.not("completed_user_id", "is", null)
		.is("restored_at", null)
		.order("completed_at", { ascending: false })
		.limit(1);

	if (error) {
		return {
			status: "error",
			error,
		};
	}

	if (!data?.length) {
		return {
			status: "missing",
		};
	}

	return {
		status: "ok",
		session: data[0],
	};
}

export async function markRestoreSessionRestored(tokenHash) {
	if (!isAccountLinkingReady()) {
		return {
			status: "not_configured",
		};
	}

	const supabase = getSupabaseAdmin();
	const { error } = await supabase
		.from("account_link_tokens")
		.update({
			restored_at: new Date().toISOString(),
		})
		.eq("token_hash", tokenHash);

	if (error) {
		return {
			status: "error",
			error,
		};
	}

	return {
		status: "ok",
	};
}

export async function getLinkedAccountByWhatsApp(whatsappJid) {
	if (!isAccountLinkingReady()) {
		return {
			status: "not_configured",
		};
	}

	const jid = normalizeJid(whatsappJid);
	const supabase = getSupabaseAdmin();
	const { data, error } = await supabase
		.from("whatsapp_links")
		.select("id, user_id, whatsapp_jid, display_name, linked_at")
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

	const { data: profile, error: profileError } = await supabase
		.from("profiles")
		.select("email, display_name, avatar_url")
		.eq("id", data.user_id)
		.maybeSingle();

	if (profileError) {
		return {
			status: "error",
			error: profileError,
		};
	}

	return {
		status: "ok",
		link: data,
		profile,
	};
}
