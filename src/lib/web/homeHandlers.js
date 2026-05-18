import { BRAND_CONFIG } from "#config/brand";
import { SUPABASE_CONFIG } from "#config/supabase";

export function renderHomePage() {
	const dashboardUrl = new URL("/dashboard", SUPABASE_CONFIG.publicUrl);
	const sourceUrl = BRAND_CONFIG.sourceUrl;

	return `<!doctype html>
<html lang="id">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${BRAND_CONFIG.name}</title>
	<meta name="description" content="${BRAND_CONFIG.description}" />
	<style>
		:root {
			color-scheme: dark;
			--bg: #101418;
			--panel: #171d1c;
			--panel-2: #202826;
			--line: rgba(246, 242, 232, 0.13);
			--text: #f6f2e8;
			--muted: rgba(246, 242, 232, 0.68);
			--soft: rgba(246, 242, 232, 0.08);
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
		html {
			scroll-behavior: smooth;
		}
		body {
			margin: 0;
			min-height: 100vh;
			background:
				linear-gradient(120deg, rgba(130, 176, 147, 0.12), transparent 32rem),
				linear-gradient(180deg, #101418 0%, #151b1b 100%);
		}
		a {
			color: inherit;
			text-decoration: none;
		}
		.shell {
			width: min(1120px, calc(100% - 32px));
			margin: 0 auto;
			padding: 24px 0 44px;
		}
		header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 16px;
			padding-bottom: 26px;
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
		.brand-text {
			min-width: 0;
		}
		h1, h2, h3, p {
			margin: 0;
		}
		.brand h1 {
			font-size: 22px;
			line-height: 1.1;
			letter-spacing: 0;
		}
		.sub {
			color: var(--muted);
			font-size: 14px;
			margin-top: 3px;
		}
		nav {
			display: flex;
			align-items: center;
			justify-content: flex-end;
			gap: 10px;
			flex-wrap: wrap;
		}
		.nav-link, .button {
			border-radius: 6px;
			font-size: 14px;
			font-weight: 700;
		}
		.nav-link {
			padding: 10px 11px;
			color: var(--muted);
		}
		.nav-link:hover {
			color: var(--text);
			background: var(--soft);
		}
		.button {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			min-height: 42px;
			padding: 11px 15px;
			background: var(--text);
			color: var(--bg);
		}
		.button.secondary {
			background: var(--soft);
			color: var(--text);
			border: 1px solid var(--line);
		}
		.hero {
			display: grid;
			grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
			gap: 24px;
			align-items: stretch;
			padding: 30px 0 18px;
		}
		.hero-copy {
			display: flex;
			flex-direction: column;
			justify-content: center;
			min-height: 420px;
		}
		.hero h2 {
			max-width: 720px;
			font-size: clamp(42px, 7vw, 76px);
			line-height: 0.95;
			letter-spacing: 0;
		}
		.hero p {
			max-width: 620px;
			margin-top: 22px;
			color: var(--muted);
			font-size: 18px;
			line-height: 1.7;
		}
		.hero-actions {
			display: flex;
			flex-wrap: wrap;
			gap: 10px;
			margin-top: 26px;
		}
		.preview {
			border: 1px solid var(--line);
			border-radius: 8px;
			background: rgba(23, 29, 28, 0.82);
			box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
			overflow: hidden;
		}
		.preview-head {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
			padding: 14px 16px;
			border-bottom: 1px solid var(--line);
		}
		.status {
			display: inline-flex;
			align-items: center;
			gap: 8px;
			color: var(--muted);
			font-size: 13px;
		}
		.dot {
			width: 8px;
			height: 8px;
			border-radius: 999px;
			background: var(--green);
			box-shadow: 0 0 0 5px rgba(130, 176, 147, 0.13);
		}
		.preview-body {
			display: grid;
			gap: 12px;
			padding: 18px;
		}
		.message {
			width: fit-content;
			max-width: 88%;
			border: 1px solid var(--line);
			border-radius: 8px;
			padding: 12px 14px;
			background: rgba(246, 242, 232, 0.055);
			color: var(--text);
			font-size: 14px;
			line-height: 1.55;
		}
		.message.bot {
			background: rgba(130, 176, 147, 0.12);
			border-color: rgba(130, 176, 147, 0.24);
		}
		.message.user {
			justify-self: end;
			background: rgba(240, 195, 106, 0.11);
			border-color: rgba(240, 195, 106, 0.22);
		}
		.panel-grid {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 14px;
			margin-top: 18px;
		}
		.panel {
			border: 1px solid var(--line);
			border-radius: 8px;
			background: rgba(23, 29, 28, 0.72);
			padding: 18px;
		}
		.panel h3 {
			font-size: 16px;
			line-height: 1.25;
		}
		.panel p, .command-list p {
			margin-top: 10px;
			color: var(--muted);
			font-size: 14px;
			line-height: 1.65;
		}
		.section {
			padding-top: 34px;
		}
		.section-head {
			display: flex;
			align-items: end;
			justify-content: space-between;
			gap: 18px;
			margin-bottom: 14px;
		}
		.section h2 {
			font-size: 28px;
			line-height: 1.1;
			letter-spacing: 0;
		}
		.section-head p {
			max-width: 520px;
			color: var(--muted);
			font-size: 14px;
			line-height: 1.65;
		}
		.command-list {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 10px;
		}
		.command {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: 12px;
			border: 1px solid var(--line);
			border-radius: 8px;
			padding: 14px;
			background: rgba(246, 242, 232, 0.035);
		}
		code {
			color: var(--gold);
			font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
			font-size: 13px;
			white-space: nowrap;
		}
		.footer {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 16px;
			margin-top: 40px;
			padding-top: 18px;
			border-top: 1px solid var(--line);
			color: var(--muted);
			font-size: 13px;
		}
		.footer a {
			color: var(--text);
		}
		@media (max-width: 860px) {
			.shell {
				width: min(100% - 24px, 1120px);
				padding-top: 18px;
			}
			header, nav, .section-head, .footer {
				align-items: flex-start;
				justify-content: flex-start;
			}
			header, .section-head, .footer {
				flex-direction: column;
			}
			.hero {
				grid-template-columns: 1fr;
				padding-top: 12px;
			}
			.hero-copy {
				min-height: auto;
				padding: 24px 0 4px;
			}
			.hero h2 {
				font-size: clamp(40px, 13vw, 58px);
			}
			.hero p {
				font-size: 16px;
			}
			.panel-grid, .command-list {
				grid-template-columns: 1fr;
			}
			.command {
				flex-direction: column;
			}
		}
	</style>
</head>
<body>
	<div class="shell">
		<header>
			<a class="brand" href="/" aria-label="${BRAND_CONFIG.name}">
				<div class="mark">A</div>
				<div class="brand-text">
					<h1>${BRAND_CONFIG.name}</h1>
					<p class="sub">Bot petualangan WhatsApp</p>
				</div>
			</a>
			<nav aria-label="Navigasi utama">
				<a class="nav-link" href="#fitur">Fitur</a>
				<a class="nav-link" href="#command">Command</a>
				<a class="button secondary" href="${dashboardUrl.pathname}">Dashboard</a>
			</nav>
		</header>

		<main>
			<section class="hero">
				<div class="hero-copy">
					<h2>Aetheria</h2>
					<p>Bot WhatsApp petualangan dengan karakter, class, farming, inventory, cloud save Google, dan dashboard web untuk melihat progress akun.</p>
					<div class="hero-actions">
						<a class="button" href="${dashboardUrl.pathname}">Buka Dashboard</a>
						<a class="button secondary" href="#command">Lihat Command</a>
					</div>
				</div>
				<div class="preview" aria-label="Preview percakapan Aetheria">
					<div class="preview-head">
						<strong>${BRAND_CONFIG.name}</strong>
						<span class="status"><span class="dot"></span>Online</span>
					</div>
					<div class="preview-body">
						<div class="message user">.mulai warrior</div>
						<div class="message bot">Karakter dibuat. Warrior Lv 1 siap menjelajah.</div>
						<div class="message user">.profil</div>
						<div class="message bot">HP, energi, XP, gold, gear, dan record tampil langsung dari save aktif.</div>
						<div class="message user">.login</div>
						<div class="message bot">Masuk Google untuk mengamankan cloud save dan membuka dashboard.</div>
					</div>
				</div>
			</section>

			<section id="fitur" class="section">
				<div class="section-head">
					<h2>Info Bot</h2>
					<p>Main sebagai guest tetap bisa. Google dipakai sebagai save utama agar akun bisa dipulihkan saat pindah nomor atau device.</p>
				</div>
				<div class="panel-grid">
					<div class="panel">
						<h3>Petualangan</h3>
						<p>Mulai karakter, daftar guild, jelajah zona, lawan monster, serap skill, evolusi ras, dan naik level dari WhatsApp.</p>
					</div>
					<div class="panel">
						<h3>Guild & Squad</h3>
						<p>Guild Petualang membuka jelajah, Guild Pedagang membuka kerja, dan squad disiapkan untuk dungeon serta raid.</p>
					</div>
					<div class="panel">
						<h3>Cloud Save</h3>
						<p>Satu Google menyimpan satu akun. Logout melepas nomor WhatsApp tanpa mengubah cloud save menjadi guest.</p>
					</div>
					<div class="panel">
						<h3>Dashboard</h3>
						<p>Halaman user ada di /dashboard untuk melihat karakter, resource, gear, inventory, dan status akun WhatsApp.</p>
					</div>
					<div class="panel">
						<h3>Supporter</h3>
						<p>Supporter dan Aether Pass pra-season tersedia sebagai dukungan kosmetik tanpa mengunci progress utama.</p>
					</div>
				</div>
			</section>

			<section id="command" class="section">
				<div class="section-head">
					<h2>Command Awal</h2>
					<p>Gunakan command ini dari WhatsApp. Prefix mengikuti setting bot yang sedang aktif.</p>
				</div>
				<div class="command-list">
					<div class="command"><div><strong>Buat karakter</strong><p>Pilih class awal untuk akun guest atau akun terhubung.</p></div><code>.mulai warrior</code></div>
					<div class="command"><div><strong>Cek karakter</strong><p>Lihat status, resource, level, dan record karakter.</p></div><code>.profil</code></div>
					<div class="command"><div><strong>Guild</strong><p>Daftar Petualang untuk jelajah atau Pedagang untuk kerja.</p></div><code>.guild</code></div>
					<div class="command"><div><strong>Squad</strong><p>Buat atau join squad untuk dungeon dan raid berikutnya.</p></div><code>.squad</code></div>
					<div class="command"><div><strong>Race evolution</strong><p>Lihat jalur evolusi dan syarat rank berikutnya.</p></div><code>.race</code></div>
					<div class="command"><div><strong>Skill absorb</strong><p>Lihat skill yang diserap dan awaken unique skill.</p></div><code>.skill</code></div>
					<div class="command"><div><strong>Premium</strong><p>Cek Supporter, Aether Pass, benefit, dan cara aktivasi.</p></div><code>.premium</code></div>
					<div class="command"><div><strong>Hubungkan Google</strong><p>Simpan progress ke cloud save Google.</p></div><code>.login</code></div>
					<div class="command"><div><strong>Pulihkan akun</strong><p>Ambil cloud save Google ke nomor WhatsApp aktif.</p></div><code>.restore</code></div>
					<div class="command"><div><strong>Lepas akun</strong><p>Putuskan nomor WhatsApp dari Google.</p></div><code>.logout confirm</code></div>
					<div class="command"><div><strong>Gameplay</strong><p>Jelajah, kerja, craft, jual item, heal, dan lihat map.</p></div><code>.help petualangan</code></div>
				</div>
			</section>
		</main>

		<footer class="footer">
			<span>${BRAND_CONFIG.name} berjalan sebagai bot WhatsApp. Web ini hanya info dan dashboard.</span>
			<a href="${sourceUrl}">Source</a>
		</footer>
	</div>
	<script>
		if (location.hash.includes("access_token=") || location.hash.includes("refresh_token=")) {
			location.replace("/dashboard" + location.hash);
		}
	</script>
</body>
</html>`;
}
