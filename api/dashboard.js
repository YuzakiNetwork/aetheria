import { renderDashboardPage } from "#lib/supabase/dashboardHandlers";

export default function handler(req, res) {
	if (req.method !== "GET") {
		res.setHeader("allow", "GET");
		res.status(405).json({
			status: "method_not_allowed",
		});
		return;
	}

	res.setHeader("content-type", "text/html; charset=utf-8");
	res.setHeader("cache-control", "no-store");
	res.status(200).send(renderDashboardPage());
}
