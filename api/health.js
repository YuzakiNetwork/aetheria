import { isAccountLinkingReady } from "#lib/supabase/accountLinking";

export default function handler(req, res) {
	if (req.method !== "GET") {
		res.setHeader("allow", "GET");
		res.status(405).json({
			status: "method_not_allowed",
		});
		return;
	}

	res.setHeader("cache-control", "no-store");
	res.status(200).json({
		status: "ok",
		service: "aetheria-link",
		supabaseConfigured: isAccountLinkingReady(),
	});
}
