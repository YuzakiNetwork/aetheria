import { SUPABASE_CONFIG } from "#config/supabase";
import print from "#lib/print";
import { isAccountLinkingReady } from "#lib/supabase/accountLinking";
import {
	completeAccountLinkResponse,
	getAccountLinkPageResponse,
} from "#lib/supabase/linkHandlers";
import { createServer } from "node:http";

const MAX_BODY_BYTES = 32 * 1024;

function sendJson(res, statusCode, payload) {
	res.writeHead(statusCode, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store",
	});
	res.end(JSON.stringify(payload));
}

function sendHtml(res, statusCode, html) {
	res.writeHead(statusCode, {
		"content-type": "text/html; charset=utf-8",
		"cache-control": "no-store",
	});
	res.end(html);
}

function readJsonBody(req) {
	return new Promise((resolve, reject) => {
		let body = "";

		req.on("data", (chunk) => {
			body += chunk;

			if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
				reject(new Error("Payload terlalu besar."));
				req.destroy();
			}
		});

		req.on("end", () => {
			try {
				resolve(body ? JSON.parse(body) : {});
			} catch {
				reject(new Error("Payload JSON tidak valid."));
			}
		});

		req.on("error", reject);
	});
}

async function handleLinkPage(res, token) {
	const response = await getAccountLinkPageResponse(token);

	sendHtml(res, response.statusCode, response.html);
}

async function handleComplete(req, res) {
	try {
		const body = await readJsonBody(req);
		const response = await completeAccountLinkResponse(body);

		sendJson(res, response.statusCode, response.payload);
	} catch (error) {
		sendJson(res, 400, {
			status: "error",
			message: error.message || "Request tidak valid.",
		});
	}
}

export async function startAccountLinkServer() {
	if (!SUPABASE_CONFIG.linkServerEnabled) {
		print.warn("[LINK] Account link server disabled.");
		return null;
	}

	if (!isAccountLinkingReady()) {
		print.warn("[LINK] Supabase env missing. Account link server skipped.");
		return null;
	}

	const server = createServer(async (req, res) => {
		try {
			const url = new URL(req.url || "/", SUPABASE_CONFIG.publicUrl);

			if (req.method === "GET" && url.pathname === "/health") {
				sendJson(res, 200, { status: "ok" });
				return;
			}

			if (
				req.method === "GET" &&
				(url.pathname === "/link" || url.pathname === "/link/callback")
			) {
				await handleLinkPage(res, url.searchParams.get("token"));
				return;
			}

			if (
				req.method === "POST" &&
				url.pathname === "/api/link/complete"
			) {
				await handleComplete(req, res);
				return;
			}

			sendJson(res, 404, { status: "not_found" });
		} catch (error) {
			sendJson(res, 500, {
				status: "error",
				message: error.message || "Internal error.",
			});
		}
	});

	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(SUPABASE_CONFIG.linkServerPort, () => {
			server.off("error", reject);
			resolve();
		});
	});

	print.info(`[LINK] Account link server: ${SUPABASE_CONFIG.publicUrl}/link`);

	return server;
}
