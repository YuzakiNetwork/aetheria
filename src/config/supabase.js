function env(name, fallback = "") {
	return String(process.env[name] || fallback).trim();
}

export const SUPABASE_CONFIG = {
	url: env("SUPABASE_URL"),
	anonKey: env("SUPABASE_PUBLISHABLE_KEY", env("SUPABASE_ANON_KEY")),
	serviceRoleKey: env("SUPABASE_SERVICE_ROLE_KEY"),
	publicUrl: env("AETHERIA_PUBLIC_URL", "http://localhost:3020"),
	linkServerPort: Number(env("AETHERIA_LINK_SERVER_PORT", "3020")),
	linkTokenTtlMinutes: Number(env("AETHERIA_LINK_TOKEN_TTL_MINUTES", "15")),
	linkServerEnabled: env("AETHERIA_LINK_SERVER_ENABLED") !== "false",
};

export function isSupabaseConfigured() {
	return Boolean(
		SUPABASE_CONFIG.url &&
		SUPABASE_CONFIG.anonKey &&
		SUPABASE_CONFIG.serviceRoleKey
	);
}
