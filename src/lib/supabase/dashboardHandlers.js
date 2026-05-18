import { BRAND_CONFIG } from "#config/brand";
import { SUPABASE_CONFIG } from "#config/supabase";
import { getDashboardData } from "#lib/supabase/rpgProfiles";

function json(statusCode, payload) {
	return {
		statusCode,
		payload,
	};
}

export function renderDashboardPage() {
	const config = {
		brandName: BRAND_CONFIG.name,
		publicUrl: SUPABASE_CONFIG.publicUrl,
		supabaseUrl: SUPABASE_CONFIG.url,
		anonKey: SUPABASE_CONFIG.anonKey,
	};

	return `<!doctype html>
<html lang="id">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${BRAND_CONFIG.name} Dashboard</title>
	<style>
		:root {
			color-scheme: dark;
			--bg: #101418;
			--panel: #171d1c;
			--panel-2: #202826;
			--line: rgba(246, 242, 232, 0.12);
			--text: #f6f2e8;
			--muted: rgba(246, 242, 232, 0.68);
			--soft: rgba(246, 242, 232, 0.1);
			--green: #82b093;
			--gold: #f0c36a;
			--red: #ff9b8f;
			font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			background: var(--bg);
			color: var(--text);
		}
		* {
			box-sizing: border-box;
		}
		body {
			margin: 0;
			min-height: 100vh;
			background:
				linear-gradient(120deg, rgba(130, 176, 147, 0.14), transparent 32rem),
				linear-gradient(180deg, #101418 0%, #151b1b 100%);
		}
		button {
			border: 0;
			border-radius: 6px;
			padding: 11px 14px;
			background: var(--text);
			color: var(--bg);
			font: inherit;
			font-size: 14px;
			font-weight: 700;
			cursor: pointer;
		}
		button.secondary {
			background: var(--soft);
			color: var(--text);
			border: 1px solid var(--line);
		}
		button:disabled {
			opacity: 0.62;
			cursor: wait;
		}
		.shell {
			width: min(1120px, calc(100% - 32px));
			margin: 0 auto;
			padding: 28px 0 40px;
		}
		header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 16px;
			padding-bottom: 22px;
		}
		.brand {
			display: flex;
			align-items: center;
			gap: 12px;
			min-width: 0;
		}
		.mark {
			width: 38px;
			height: 38px;
			display: grid;
			place-items: center;
			border: 1px solid var(--line);
			border-radius: 8px;
			background: var(--panel);
			color: var(--gold);
			font-weight: 800;
		}
		h1, h2, p {
			margin: 0;
		}
		h1 {
			font-size: 22px;
			line-height: 1.15;
			letter-spacing: 0;
		}
		.sub {
			color: var(--muted);
			font-size: 14px;
			margin-top: 3px;
		}
		.actions {
			display: flex;
			gap: 10px;
			flex-wrap: wrap;
			justify-content: flex-end;
		}
		.auth {
			min-height: calc(100vh - 80px);
			display: grid;
			place-items: center;
		}
		.auth-box {
			width: min(420px, 100%);
			border: 1px solid var(--line);
			border-radius: 8px;
			padding: 28px;
			background: rgba(23, 29, 28, 0.86);
			box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
		}
		.auth-box h1 {
			font-size: 30px;
			margin-bottom: 10px;
		}
		.auth-box p {
			color: var(--muted);
			line-height: 1.6;
			margin-bottom: 22px;
		}
		.grid {
			display: grid;
			grid-template-columns: minmax(0, 1.3fr) minmax(300px, 0.7fr);
			gap: 16px;
			align-items: start;
		}
		.panel {
			border: 1px solid var(--line);
			border-radius: 8px;
			background: rgba(23, 29, 28, 0.78);
			overflow: hidden;
		}
		.panel-head {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
			padding: 16px 18px;
			border-bottom: 1px solid var(--line);
		}
		.panel-head h2 {
			font-size: 15px;
			line-height: 1.2;
		}
		.panel-body {
			padding: 18px;
		}
		.hero {
			display: grid;
			grid-template-columns: 82px minmax(0, 1fr);
			gap: 16px;
			align-items: center;
		}
		.avatar {
			width: 82px;
			height: 82px;
			border-radius: 8px;
			object-fit: cover;
			background: var(--panel-2);
			border: 1px solid var(--line);
		}
		.character {
			font-size: 30px;
			line-height: 1.05;
			font-weight: 800;
			letter-spacing: 0;
			word-break: break-word;
		}
		.meta {
			color: var(--muted);
			font-size: 14px;
			margin-top: 8px;
			line-height: 1.5;
		}
		.stats {
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			gap: 10px;
			margin-top: 18px;
		}
		.stat {
			border: 1px solid var(--line);
			border-radius: 8px;
			padding: 12px;
			background: rgba(246, 242, 232, 0.04);
		}
		.label {
			display: block;
			color: var(--muted);
			font-size: 12px;
			line-height: 1.2;
		}
		.value {
			display: block;
			font-size: 20px;
			font-weight: 800;
			margin-top: 7px;
			line-height: 1.1;
		}
		.bars {
			display: grid;
			gap: 12px;
			margin-top: 18px;
		}
		.bar-row {
			display: grid;
			grid-template-columns: 48px minmax(0, 1fr) 92px;
			gap: 10px;
			align-items: center;
			font-size: 13px;
			color: var(--muted);
		}
		.bar {
			height: 8px;
			border-radius: 999px;
			background: rgba(246, 242, 232, 0.1);
			overflow: hidden;
		}
		.fill {
			height: 100%;
			width: 0;
			background: var(--green);
		}
		.fill.gold {
			background: var(--gold);
		}
		table {
			width: 100%;
			border-collapse: collapse;
			font-size: 14px;
		}
		td {
			padding: 10px 0;
			border-bottom: 1px solid var(--line);
			color: var(--muted);
		}
		td:last-child {
			color: var(--text);
			text-align: right;
			font-weight: 700;
		}
		tr:last-child td {
			border-bottom: 0;
		}
		.empty {
			padding: 28px;
			border: 1px dashed rgba(246, 242, 232, 0.22);
			border-radius: 8px;
			color: var(--muted);
			line-height: 1.6;
		}
		.status {
			min-height: 22px;
			color: var(--muted);
			font-size: 14px;
			margin-top: 14px;
			white-space: pre-wrap;
		}
		.error {
			color: var(--red);
		}
		.hidden {
			display: none !important;
		}
		@media (max-width: 820px) {
			.shell {
				width: min(100% - 24px, 1120px);
				padding-top: 18px;
			}
			header, .actions {
				align-items: flex-start;
				justify-content: flex-start;
			}
			header {
				flex-direction: column;
			}
			.grid {
				grid-template-columns: 1fr;
			}
			.stats {
				grid-template-columns: repeat(2, minmax(0, 1fr));
			}
			.hero {
				grid-template-columns: 64px minmax(0, 1fr);
			}
			.avatar {
				width: 64px;
				height: 64px;
			}
			.character {
				font-size: 24px;
			}
			.bar-row {
				grid-template-columns: 42px minmax(0, 1fr);
			}
			.bar-row span:last-child {
				grid-column: 2;
			}
		}
	</style>
</head>
<body>
	<section id="auth" class="auth">
		<div class="auth-box">
			<h1>${BRAND_CONFIG.name}</h1>
			<p>Masuk untuk melihat karakter, resource, gear, inventory, dan status akun WhatsApp.</p>
			<button id="login" type="button">Masuk dengan Google</button>
			<div id="auth-status" class="status"></div>
		</div>
	</section>

	<section id="app" class="shell hidden">
		<header>
			<div class="brand">
				<div class="mark">A</div>
				<div>
					<h1>${BRAND_CONFIG.name}</h1>
					<p id="user-meta" class="sub">Dashboard</p>
				</div>
			</div>
			<div class="actions">
				<button id="refresh" class="secondary" type="button">Refresh</button>
				<button id="signout" class="secondary" type="button">Keluar</button>
			</div>
		</header>

		<div id="content"></div>
	</section>

	<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
	<script>
		const CONFIG = ${JSON.stringify(config)};
		const authEl = document.getElementById("auth");
		const appEl = document.getElementById("app");
		const contentEl = document.getElementById("content");
		const userMetaEl = document.getElementById("user-meta");
		const loginBtn = document.getElementById("login");
		const refreshBtn = document.getElementById("refresh");
		const signoutBtn = document.getElementById("signout");
		const authStatusEl = document.getElementById("auth-status");
		const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.anonKey);

		function escapeHtml(value) {
			return String(value ?? "").replace(/[&<>"']/g, (char) => ({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#039;",
			})[char]);
		}

		function fmt(value) {
			return new Intl.NumberFormat("id-ID").format(Number(value || 0));
		}

		function percent(current, max) {
			const safeMax = Math.max(1, Number(max || 0));
			return Math.max(0, Math.min(100, Math.round((Number(current || 0) / safeMax) * 100)));
		}

		function dateTime(value) {
			if (!value) return "-";
			return new Intl.DateTimeFormat("id-ID", {
				dateStyle: "medium",
				timeStyle: "short",
			}).format(new Date(value));
		}

		function setAuthStatus(message, isError = false) {
			authStatusEl.textContent = message || "";
			authStatusEl.className = isError ? "status error" : "status";
		}

		function showAuth(message = "") {
			authEl.classList.remove("hidden");
			appEl.classList.add("hidden");
			setAuthStatus(message);
		}

		function showApp() {
			authEl.classList.add("hidden");
			appEl.classList.remove("hidden");
		}

		function resourceBar(label, current, max, tone = "") {
			return \`
				<div class="bar-row">
					<span>\${label}</span>
					<div class="bar"><div class="fill \${tone}" style="width: \${percent(current, max)}%"></div></div>
					<span>\${fmt(current)} / \${fmt(max)}</span>
				</div>
			\`;
		}

		function keyValueRows(rows) {
			return rows.map(([label, value]) => \`
				<tr>
					<td>\${escapeHtml(label)}</td>
					<td>\${escapeHtml(value)}</td>
				</tr>
			\`).join("");
		}

		function renderDashboard(data) {
			const profile = data.profile || {};
			const link = data.link;
			const rpg = data.rpg || null;
			const premium = data.premium || {};
			const guild = data.guild || {};
			const squad = data.squad || {};
			const displayName = profile.display_name || link?.display_name || data.user?.email || "Aetheria";

			userMetaEl.textContent = data.user?.email || "Dashboard";

			if (!link) {
				contentEl.innerHTML = \`
					<div class="panel">
						<div class="panel-head"><h2>Akun</h2></div>
						<div class="panel-body">
							<div class="empty">Akun Google ini belum terhubung ke WhatsApp. Buka WhatsApp lalu ketik <strong>.login</strong>.</div>
						</div>
					</div>
				\`;
				return;
			}

			if (!rpg) {
				contentEl.innerHTML = \`
					<div class="grid">
						<div class="panel">
							<div class="panel-head"><h2>Akun</h2></div>
							<div class="panel-body">
								<div class="hero">
									<img class="avatar" src="\${escapeHtml(profile.avatar_url || "")}" alt="" />
									<div>
										<div class="character">\${escapeHtml(displayName)}</div>
										<div class="meta">WhatsApp terhubung. Data karakter belum tersinkron.</div>
									</div>
								</div>
							</div>
						</div>
						<div class="panel">
							<div class="panel-head"><h2>Sinkronisasi</h2></div>
							<div class="panel-body">
								<div class="empty">Ketik <strong>.profil</strong> di WhatsApp untuk mengirim snapshot karakter ke dashboard.</div>
							</div>
						</div>
					</div>
				\`;
				return;
			}

			const items = rpg.items || {};
			const gear = rpg.gear || {};
			const snapshot = rpg.snapshot || {};
			const raceText = snapshot.raceName
				? \`\${snapshot.raceName} Rank \${snapshot.raceRank || "-"}\`
				: "-";
			const skillRows = Array.isArray(snapshot.equippedSkills) && snapshot.equippedSkills.length
				? snapshot.equippedSkills.map((skill) => [
						skill.type === "unique" ? "Unique" : "Skill",
						\`\${skill.name} Lv \${skill.level}\`,
					])
				: [["Skill", "-"]];
			const premiumRows = [
				["Status", premium.label || "Free"],
				["Supporter", premium.supporter ? dateTime(premium.supporterExpiresAt) : "-"],
				["Aether Pass", premium.aetherPass ? dateTime(premium.aetherPassExpiresAt) : "-"],
			];
			const socialRows = [
				["Guild", guild.label || "Belum daftar"],
				["Squad", squad.name ? \`\${squad.name} (\${squad.memberCount}/\${squad.maxMembers})\` : "-"],
				["Kode Squad", squad.code || "-"],
			];
			const itemRows = Object.entries(items).length
				? Object.entries(items).map(([name, amount]) => [name, amount])
				: [["Kosong", "-"]];

			contentEl.innerHTML = \`
				<div class="grid">
					<div>
						<div class="panel">
							<div class="panel-head">
								<h2>Karakter</h2>
								<span class="sub">Sync \${escapeHtml(dateTime(rpg.synced_at))}</span>
							</div>
							<div class="panel-body">
								<div class="hero">
									<img class="avatar" src="\${escapeHtml(profile.avatar_url || "")}" alt="" />
									<div>
										<div class="character">\${escapeHtml(rpg.character_name)}</div>
										<div class="meta">\${escapeHtml(rpg.class_name)} | \${escapeHtml(raceText)} | Lv \${fmt(rpg.level)} | \${escapeHtml(rpg.zone_name || "-")}</div>
									</div>
								</div>
								<div class="stats">
									<div class="stat"><span class="label">Gold</span><span class="value">\${fmt(rpg.gold)}</span></div>
									<div class="stat"><span class="label">ATK</span><span class="value">\${fmt(rpg.attack)}</span></div>
									<div class="stat"><span class="label">DEF</span><span class="value">\${fmt(rpg.defense)}</span></div>
									<div class="stat"><span class="label">AGI</span><span class="value">\${fmt(rpg.agility)}</span></div>
								</div>
								<div class="bars">
									\${resourceBar("HP", rpg.hp, rpg.max_hp)}
									\${resourceBar("EN", rpg.energy, rpg.max_energy)}
									\${resourceBar("XP", rpg.xp, rpg.xp_next, "gold")}
								</div>
							</div>
						</div>

						<div class="panel" style="margin-top:16px">
							<div class="panel-head"><h2>Inventory</h2></div>
							<div class="panel-body">
								<table><tbody>\${keyValueRows(itemRows)}</tbody></table>
							</div>
						</div>
					</div>

					<div>
						<div class="panel">
							<div class="panel-head"><h2>Identity</h2></div>
							<div class="panel-body">
								<table><tbody>\${keyValueRows([
									["Race", raceText],
									["Title", snapshot.raceTitle || "-"],
									["Owned Skill", snapshot.ownedSkillCount || 0],
									["Premium", premium.label || "Free"],
									["Guild", guild.label || "Belum daftar"],
								])}</tbody></table>
							</div>
						</div>

						<div class="panel" style="margin-top:16px">
							<div class="panel-head"><h2>Guild & Squad</h2></div>
							<div class="panel-body">
								<table><tbody>\${keyValueRows(socialRows)}</tbody></table>
							</div>
						</div>

						<div class="panel" style="margin-top:16px">
							<div class="panel-head"><h2>Premium</h2></div>
							<div class="panel-body">
								<table><tbody>\${keyValueRows(premiumRows)}</tbody></table>
							</div>
						</div>

						<div class="panel" style="margin-top:16px">
							<div class="panel-head"><h2>Skill Aktif</h2></div>
							<div class="panel-body">
								<table><tbody>\${keyValueRows(skillRows)}</tbody></table>
							</div>
						</div>

						<div class="panel" style="margin-top:16px">
							<div class="panel-head"><h2>Gear</h2></div>
							<div class="panel-body">
								<table><tbody>\${keyValueRows([
									["Weapon", gear.weapon || "-"],
									["Armor", gear.armor || "-"],
									["Charm", gear.charm || "-"],
								])}</tbody></table>
							</div>
						</div>

						<div class="panel" style="margin-top:16px">
							<div class="panel-head"><h2>Record</h2></div>
							<div class="panel-body">
								<table><tbody>\${keyValueRows([
									["Win", fmt(rpg.wins)],
									["Lose", fmt(rpg.losses)],
									["Job", fmt(rpg.jobs)],
									["WhatsApp", link.whatsapp_jid || "-"],
									["Linked", dateTime(link.linked_at)],
								])}</tbody></table>
							</div>
						</div>
					</div>
				</div>
			\`;
		}

		async function loadDashboard() {
			const { data } = await client.auth.getSession();
			const token = data.session?.access_token;

			if (!token) {
				showAuth();
				return;
			}

			showApp();
			contentEl.innerHTML = '<div class="panel"><div class="panel-body"><div class="empty">Memuat dashboard...</div></div></div>';

			const res = await fetch("/api/dashboard/me", {
				headers: {
					authorization: \`Bearer \${token}\`,
				},
			});
			const payload = await res.json();

			if (!res.ok || payload.status !== "ok") {
				throw new Error(payload.message || "Gagal memuat dashboard.");
			}

			renderDashboard(payload);
		}

		loginBtn.addEventListener("click", async () => {
			loginBtn.disabled = true;
			setAuthStatus("Membuka Google...");
			const redirectTo = new URL("/dashboard", CONFIG.publicUrl);

			const { error } = await client.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo: redirectTo.toString(),
				},
			});

			if (error) {
				loginBtn.disabled = false;
				setAuthStatus(error.message, true);
			}
		});

		refreshBtn.addEventListener("click", () => {
			loadDashboard().catch((error) => {
				contentEl.innerHTML = \`<div class="panel"><div class="panel-body"><div class="empty error">\${escapeHtml(error.message)}</div></div></div>\`;
			});
		});

		signoutBtn.addEventListener("click", async () => {
			await client.auth.signOut();
			showAuth("Sudah keluar.");
		});

		loadDashboard().catch((error) => {
			loginBtn.disabled = false;
			showAuth(error.message || "Gagal memuat sesi.");
			authStatusEl.classList.add("error");
		});
	</script>
</body>
</html>`;
}

export async function getDashboardResponse(accessToken) {
	const result = await getDashboardData(accessToken);

	if (result.status === "not_configured") {
		return json(500, {
			status: result.status,
			message: "Supabase belum dikonfigurasi.",
		});
	}

	if (result.status === "unauthorized") {
		return json(401, {
			status: result.status,
			message: "Sesi tidak valid.",
		});
	}

	if (result.status !== "ok") {
		return json(400, {
			status: result.status,
			message: result.error?.message || "Gagal memuat dashboard.",
		});
	}

	return json(200, result);
}
