import { getDashboardResponse } from "#lib/supabase/dashboardHandlers";

function getAccessToken(req) {
	const header = req.headers.authorization || "";
	const [type, token] = header.split(/\s+/);

	if (type?.toLowerCase() !== "bearer") {
		return "";
	}

	return token || "";
}

export default async function handler(req, res) {
	if (req.method !== "GET") {
		res.setHeader("allow", "GET");
		res.status(405).json({
			status: "method_not_allowed",
		});
		return;
	}

	const response = await getDashboardResponse(getAccessToken(req));

	res.setHeader("cache-control", "no-store");
	res.status(response.statusCode).json(response.payload);
}
