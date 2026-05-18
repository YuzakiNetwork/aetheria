import { getAccountLinkPageResponse } from "#lib/supabase/linkHandlers";

export default async function handler(req, res) {
	if (req.method !== "GET") {
		res.setHeader("allow", "GET");
		res.status(405).json({
			status: "method_not_allowed",
		});
		return;
	}

	const token = Array.isArray(req.query.token)
		? req.query.token[0]
		: req.query.token;
	const response = await getAccountLinkPageResponse(token);

	res.setHeader("content-type", "text/html; charset=utf-8");
	res.setHeader("cache-control", "no-store");
	res.status(response.statusCode).send(response.html);
}
