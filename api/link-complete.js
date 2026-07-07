import { completeAccountLinkResponse } from "#lib/supabase/linkHandlers";

function getBody(req) {
	if (!req.body) {
		return {};
	}

	if (typeof req.body === "string") {
		return JSON.parse(req.body);
	}

	return req.body;
}

export default async function handler(req, res) {
	if (req.method !== "POST") {
		res.setHeader("allow", "POST");
		res.status(405).json({
			status: "method_not_allowed",
		});
		return;
	}

	try {
		const response = await completeAccountLinkResponse(getBody(req));

		res.setHeader("cache-control", "no-store");
		res.status(response.statusCode).json(response.payload);
	} catch (error) {
		res.status(400).json({
			status: "error",
			message: error.message || "Request tidak valid.",
		});
	}
}
