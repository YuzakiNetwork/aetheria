import { BRAND_CONFIG } from "#config/brand";
import { SUPABASE_CONFIG } from "#config/supabase";
import {
	completeAccountLink,
	getAccountLinkByToken,
} from "#lib/supabase/accountLinking";

export function renderAccountLinkPage({ token, status, message, purpose }) {
	const isRestore = purpose === "restore";
	const config = {
		brandName: BRAND_CONFIG.name,
		description: BRAND_CONFIG.description,
		publicUrl: SUPABASE_CONFIG.publicUrl,
		supabaseUrl: SUPABASE_CONFIG.url,
		anonKey: SUPABASE_CONFIG.anonKey,
		token,
		status,
		message,
		purpose,
	};

	return `<!doctype html>
<html lang="id">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${BRAND_CONFIG.name}</title>
	<style>
		:root {
			color-scheme: light dark;
			font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			background: #101418;
			color: #f6f2e8;
		}
		body {
			margin: 0;
			min-height: 100vh;
			display: grid;
			place-items: center;
			padding: 24px;
			background:
				radial-gradient(circle at top left, rgba(95, 133, 117, 0.35), transparent 34rem),
				linear-gradient(135deg, #101418 0%, #1f2926 100%);
		}
		main {
			width: min(100%, 420px);
			border: 1px solid rgba(246, 242, 232, 0.16);
			border-radius: 8px;
			padding: 28px;
			background: rgba(16, 20, 24, 0.82);
			box-shadow: 0 24px 70px rgba(0, 0, 0, 0.32);
		}
		h1 {
			font-size: 28px;
			line-height: 1.1;
			margin: 0 0 8px;
			letter-spacing: 0;
		}
		p {
			margin: 0 0 18px;
			color: rgba(246, 242, 232, 0.76);
			line-height: 1.6;
		}
		button {
			width: 100%;
			border: 0;
			border-radius: 6px;
			padding: 13px 16px;
			background: #f6f2e8;
			color: #101418;
			font-weight: 700;
			cursor: pointer;
		}
		button:disabled {
			cursor: wait;
			opacity: 0.7;
		}
		.status {
			min-height: 24px;
			margin-top: 18px;
			font-size: 14px;
			color: #cbd9ce;
			white-space: pre-wrap;
		}
		.error {
			color: #ffb4a9;
		}
	</style>
</head>
<body>
	<main>
		<h1>${BRAND_CONFIG.name}</h1>
		<p>${isRestore ? "Masuk dengan Google untuk menyiapkan pemulihan cloud save." : "Hubungkan akun Google ke WhatsApp untuk mengamankan progres."}</p>
		<button id="login" type="button">Masuk dengan Google</button>
		<div id="status" class="status"></div>
	</main>
	<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
	<script>
		const CONFIG = ${JSON.stringify(config)};
		const statusEl = document.getElementById("status");
		const loginBtn = document.getElementById("login");
		const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.anonKey);

		function setStatus(message, isError = false) {
			statusEl.textContent = message;
			statusEl.className = isError ? "status error" : "status";
		}

		async function complete(accessToken) {
			loginBtn.disabled = true;
			setStatus("Menghubungkan akun...");

			const res = await fetch("/api/link/complete", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					token: CONFIG.token,
					accessToken,
				}),
			});
			const payload = await res.json();

			if (!res.ok || payload.status !== "ok") {
				throw new Error(payload.message || "Gagal menghubungkan akun.");
			}

			if (payload.action === "restore_ready") {
				setStatus("Cloud save siap dipulihkan. Kembali ke WhatsApp lalu ketik .restore apply.");
				return;
			}

			setStatus("Akun berhasil terhubung. Halaman ini bisa ditutup.");
		}

		async function init() {
			if (CONFIG.status !== "ok") {
				loginBtn.disabled = true;
				setStatus(CONFIG.message || "Link tidak valid.", true);
				return;
			}

			const { data } = await client.auth.getSession();

			if (data.session?.access_token) {
				await complete(data.session.access_token);
				return;
			}

			setStatus("Lanjutkan login untuk menghubungkan akun.");
		}

		loginBtn.addEventListener("click", async () => {
			loginBtn.disabled = true;
			const redirectTo = new URL("/link/callback", CONFIG.publicUrl);
			redirectTo.searchParams.set("token", CONFIG.token);

			const { error } = await client.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo: redirectTo.toString(),
				},
			});

			if (error) {
				loginBtn.disabled = false;
				setStatus(error.message, true);
			}
		});

		init().catch((error) => {
			loginBtn.disabled = false;
			setStatus(error.message || "Terjadi kesalahan.", true);
		});
	</script>
</body>
</html>`;
}

export function getStatusMessage(status) {
	const messages = {
		not_configured: "Supabase belum dikonfigurasi.",
		not_found: "Link login tidak ditemukan.",
		used: "Link login sudah dipakai.",
		expired: "Link login sudah kedaluwarsa. Minta link baru dari bot.",
		error: "Gagal memeriksa link login.",
	};

	return messages[status] || "Link login tidak valid.";
}

export async function getAccountLinkPageResponse(token) {
	if (!token) {
		return {
			statusCode: 400,
			html: renderAccountLinkPage({
				token: "",
				status: "invalid",
				message: "Token tidak ada.",
				purpose: "link",
			}),
		};
	}

	const result = await getAccountLinkByToken(token);
	const ok = result.status === "ok";

	return {
		statusCode: ok ? 200 : 400,
		html: renderAccountLinkPage({
			token,
			status: result.status,
			message: ok ? "" : getStatusMessage(result.status),
			purpose: result.link?.purpose || "link",
		}),
	};
}

export async function completeAccountLinkResponse(body = {}) {
	const result = await completeAccountLink(body.token, body.accessToken);

	if (result.status !== "ok") {
		return {
			statusCode: 400,
			payload: {
				status: result.status,
				message: getStatusMessage(result.status),
			},
		};
	}

	return {
		statusCode: 200,
		payload: {
			status: "ok",
			action: result.action,
			user: result.user,
		},
	};
}
