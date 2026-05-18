import { SUPABASE_CONFIG, isSupabaseConfigured } from "#config/supabase";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

let adminClient = null;

export function getSupabaseAdmin() {
	if (!isSupabaseConfigured()) {
		throw new Error("Supabase belum dikonfigurasi.");
	}

	if (!adminClient) {
		adminClient = createClient(
			SUPABASE_CONFIG.url,
			SUPABASE_CONFIG.serviceRoleKey,
			{
				auth: {
					autoRefreshToken: false,
					persistSession: false,
				},
				realtime: {
					transport: WebSocket,
				},
			}
		);
	}

	return adminClient;
}
