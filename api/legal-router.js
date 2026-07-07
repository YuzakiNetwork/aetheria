import {
	renderDiscordLinkedRolesPage,
	renderPrivacyPage,
	renderTermsPage,
} from "#lib/web/homeHandlers";

const ROUTES = {
	"discord-linked-roles": renderDiscordLinkedRolesPage,
	privacy: renderPrivacyPage,
	terms: renderTermsPage,
};

export default function handler(req, res) {
	if (req.method !== "GET") {
		res.setHeader("allow", "GET");
		res.status(405).json({
			status: "method_not_allowed",
		});
		return;
	}

	const route = String(req.query?.legalRoute || "terms");
	const render = ROUTES[route] || renderTermsPage;

	res.setHeader("content-type", "text/html; charset=utf-8");
	res.setHeader("cache-control", "public, max-age=0, must-revalidate");
	res.status(200).send(render());
}
