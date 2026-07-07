import { BRAND_CONFIG } from "#config/brand";
import { SUPABASE_CONFIG } from "#config/supabase";
import { getSupportPageData } from "#lib/supabase/monetization";
import { CHANGELOG_ENTRIES } from "#lib/updates";

const navItems = [
	["/", "Home"],
	["/commands", "Commands"],
	["/changelog", "Changelog"],
	["/roadmap", "Roadmap"],
	["/support", "Support"],
	["/dashboard", "Dashboard"],
];

const commandGroups = [
	{
		key: "starter",
		label: "Mulai",
		commands: [
			[".mulai warrior", "Buat karakter awal."],
			[".profil", "Lihat status karakter."],
			[".login", "Hubungkan Google untuk cloud save."],
			[".restore", "Pulihkan cloud save ke nomor aktif."],
		],
	},
	{
		key: "rpg",
		label: "RPG",
		commands: [
			[".guild", "Daftar dan cek Guild Petualang/Pedagang."],
			[".jelajah", "Lawan monster di zona aktif."],
			[".kerja mine", "Farming gold, XP, dan material."],
			[
				".kembali",
				"Jalur cepat untuk pemain lama yang ingin aktif lagi.",
			],
			[".misi", "Lihat misi harian, mingguan, dan guild."],
			[".misi claim", "Klaim misi yang sudah selesai."],
			[".tavern", "Papan task harian/mingguan dan reward claim."],
			[".race", "Lihat jalur evolusi race."],
			[".skill", "Kelola skill yang diserap."],
		],
	},
	{
		key: "economy",
		label: "Ekonomi",
		commands: [
			[".toko", "Lihat consumable dan gear."],
			[".beli potion 2", "Beli item toko."],
			[".craft list", "Lihat recipe crafting."],
			[".jual ore 3", "Jual material atau item."],
			[".inv", "Cek inventory dan gear."],
		],
	},
	{
		key: "community",
		label: "Komunitas",
		commands: [
			[".update", "Lihat changelog dan update terbaru."],
			[".fitur", "Buka Command Finder WhatsApp yang ringkas."],
			[
				".cari <kata>",
				"Cari fitur berdasarkan command, alias, atau kategori.",
			],
			[".status", "Cek status bot, link bot, website, dan shortcut."],
			[".hof", "Lihat Weekly Hall of Fame RPG."],
			[".quote add #lucu", "Simpan quote dari pesan yang direply."],
			[".memory add <teks>", "Simpan catatan atau momen penting grup."],
			[".welcome on", "Aktifkan welcome kit otomatis untuk member baru."],
			[".topik", "Generate pembuka obrolan untuk grup."],
			[
				".event add ...",
				"Buat agenda grup dengan event card dan reminder.",
			],
			["/status", "Cek status Aetheria dari Discord."],
			["/update", "Lihat changelog Aetheria dari Discord."],
			[
				"/invite-aetheria",
				"Ambil link invite Aetheria ke server Discord lain.",
			],
			[
				"/play <query>",
				"Cari lagu/YouTube atau stream direct radio URL ke voice channel.",
			],
			["/nowplaying", "Lihat stream Discord yang sedang berjalan."],
			["/stop", "Hentikan stream Discord dan keluar voice channel."],
			["/rpg", "Buka hub RPG Discord."],
			["/start", "Buat karakter RPG Discord."],
			["/daily", "Ambil daily reward RPG dari Discord."],
			["/quest", "Lihat atau claim misi RPG dari Discord."],
			["/guild", "Daftar guild untuk membuka adventure/work."],
			["/leaderboard", "Lihat ranking karakter lintas platform."],
			[".feedback <pesan>", "Kirim feedback, bug, atau saran ke owner."],
			[".bug <pesan>", "Laporkan bug dengan konteks chat."],
			[".saran <pesan>", "Kirim ide fitur atau perbaikan."],
			[".invite", "Buat teks ajakan untuk membagikan bot ke teman."],
			[".donasi", "Dukung operasional bot dan cek cara klaim supporter."],
			[".donasi wall", "Lihat supporter wall aktif."],
			[".sponsor", "Lihat slot sponsor ringan untuk komunitas partner."],
		],
	},
];

const roadmap = [
	{
		key: "discord-rpg-starter",
		stage: "Live",
		title: "Discord RPG Starter",
		description:
			"Start/profile/daily/quest/guild/adventure/work/heal/leaderboard berjalan sebagai slash command Discord.",
	},
	{
		key: "discord-voice-stream",
		stage: "Live",
		title: "Discord Voice Stream",
		description:
			"Play/nowplaying/stop untuk query lagu, YouTube URL, dan direct radio stream di voice channel Discord.",
	},
	{
		key: "discord-adapter",
		stage: "Live",
		title: "Discord Adapter Foundation",
		description:
			"Slash command Discord awal untuk status, update, invite, support, dan fondasi RPG lintas platform.",
	},
	{
		key: "group-community-suite",
		stage: "Live",
		title: "Group Community Suite",
		description:
			"Welcome kit, auto topic harian, dan agenda grup dengan native event message.",
	},
	{
		key: "group-memory",
		stage: "Live",
		title: "Quote & Memory Group",
		description:
			"Simpan quote, inside joke, rules pendek, dan momen penting per grup.",
	},
	{
		key: "halloffame",
		stage: "Live",
		title: "Weekly Hall of Fame",
		description:
			"Recap mingguan otomatis ke newsletter dengan ranking RPG dan target kompetisi ringan.",
	},
	{
		key: "comeback",
		stage: "Live",
		title: "Comeback Retention Loop",
		description:
			"Command kembali, Return Supply saat daily, dan jalur cepat untuk user lama aktif lagi.",
	},
	{
		key: "gear",
		stage: "Next",
		title: "Gear & Crafting Expansion",
		description:
			"Rarity gear, upgrade item, material zona, dan recipe lebih panjang.",
	},
	{
		key: "dungeon",
		stage: "Planned",
		title: "Dungeon Squad",
		description:
			"Party 2-4 player, role ringan, reward rare material, dan cooldown mingguan.",
	},
	{
		key: "boss",
		stage: "Planned",
		title: "Boss & World Event",
		description:
			"Boss komunitas dengan kontribusi damage dan reward berdasarkan partisipasi.",
	},
	{
		key: "achievement",
		stage: "Planned",
		title: "Achievement & Title",
		description:
			"Title profil dari milestone seperti hunter, crafter, dan dungeon clear.",
	},
	{
		key: "marketplace",
		stage: "Later",
		title: "Marketplace",
		description:
			"Jual-beli antar player setelah ekonomi dan anti-exploit lebih stabil.",
	},
	{
		key: "supporter",
		stage: "Next",
		title: "Supporter & Sponsor Board",
		description:
			"Badge supporter, halaman operasional, sponsor ringan, dan donor wall tanpa pay-to-win.",
	},
];

function escapeHtml(value = "") {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function pageTitle(title) {
	return title ? `${title} | ${BRAND_CONFIG.name}` : BRAND_CONFIG.name;
}

function renderNav(activePath = "/") {
	return navItems
		.map(([href, label]) => {
			const active = href === activePath ? " active" : "";
			const className =
				label === "Dashboard" || label === "Owner"
					? `button secondary${active}`
					: `nav-link${active}`;

			return `<a class="${className}" href="${href}">${label}</a>`;
		})
		.join("");
}

function renderLayout({
	title = "",
	activePath = "/",
	content = "",
	script = "",
}) {
	const sourceUrl = BRAND_CONFIG.sourceUrl;

	return `<!doctype html>
<html lang="id">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${pageTitle(title)}</title>
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
		* { box-sizing: border-box; }
		html { scroll-behavior: smooth; }
		body {
			margin: 0;
			min-height: 100vh;
			background:
				linear-gradient(120deg, rgba(130, 176, 147, 0.12), transparent 32rem),
				linear-gradient(180deg, #101418 0%, #151b1b 100%);
		}
		a { color: inherit; text-decoration: none; }
		h1, h2, h3, p { margin: 0; }
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
		.nav-link, .button, .chip {
			border-radius: 6px;
			font-size: 14px;
			font-weight: 700;
		}
		.nav-link {
			padding: 10px 11px;
			color: var(--muted);
		}
		.nav-link:hover, .nav-link.active {
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
		.button.active { border-color: rgba(240, 195, 106, 0.5); }
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
		.hero h2, .page-hero h2 {
			max-width: 760px;
			font-size: clamp(42px, 7vw, 76px);
			line-height: 0.95;
			letter-spacing: 0;
		}
		.hero p, .page-hero p {
			max-width: 640px;
			margin-top: 22px;
			color: var(--muted);
			font-size: 18px;
			line-height: 1.7;
		}
		.hero-actions, .toolbar {
			display: flex;
			flex-wrap: wrap;
			gap: 10px;
			margin-top: 26px;
		}
		.preview, .card, .command, .timeline-item {
			border: 1px solid var(--line);
			border-radius: 8px;
			background: rgba(23, 29, 28, 0.76);
		}
		.preview {
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
		.panel-grid, .roadmap-grid {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 14px;
			margin-top: 18px;
		}
		.card { padding: 18px; }
		.card h3 {
			font-size: 16px;
			line-height: 1.25;
		}
		.card p, .command p, .timeline-item p {
			margin-top: 10px;
			color: var(--muted);
			font-size: 14px;
			line-height: 1.65;
		}
		.section, .page-hero { padding-top: 34px; }
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
			padding: 14px;
		}
		code {
			color: var(--gold);
			font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
			font-size: 13px;
			white-space: nowrap;
		}
		.chip {
			border: 1px solid var(--line);
			background: var(--soft);
			color: var(--text);
			cursor: pointer;
			padding: 10px 12px;
		}
		.chip.active {
			border-color: rgba(240, 195, 106, 0.5);
			color: var(--gold);
		}
		.timeline {
			display: grid;
			gap: 12px;
			margin-top: 22px;
		}
		.timeline-item {
			padding: 0;
			overflow: hidden;
		}
		.timeline-button {
			width: 100%;
			border: 0;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 16px;
			padding: 17px 18px;
			background: transparent;
			color: var(--text);
			text-align: left;
			cursor: pointer;
			font: inherit;
		}
		.timeline-body {
			display: none;
			border-top: 1px solid var(--line);
			padding: 0 18px 18px;
			color: var(--muted);
			line-height: 1.75;
		}
		.timeline-item.open .timeline-body { display: block; }
		.badge {
			display: inline-flex;
			align-items: center;
			border: 1px solid rgba(240, 195, 106, 0.26);
			border-radius: 999px;
			padding: 5px 9px;
			color: var(--gold);
			font-size: 12px;
			font-weight: 800;
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
		.footer a { color: var(--text); }
		.hidden { display: none !important; }
		.progress {
			width: 100%;
			height: 12px;
			border-radius: 999px;
			background: rgba(246, 242, 232, 0.1);
			overflow: hidden;
			margin-top: 14px;
			border: 1px solid var(--line);
		}
		.progress > span {
			display: block;
			height: 100%;
			width: var(--value, 0%);
			background: linear-gradient(90deg, var(--green), var(--gold));
		}
		.kv {
			display: grid;
			gap: 10px;
			margin-top: 14px;
			color: var(--muted);
			font-size: 14px;
			line-height: 1.6;
		}
		.kv strong { color: var(--text); }
		.list {
			margin: 12px 0 0;
			padding-left: 18px;
			color: var(--muted);
			line-height: 1.7;
			font-size: 14px;
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
			header, .section-head, .footer { flex-direction: column; }
			.hero {
				grid-template-columns: 1fr;
				padding-top: 12px;
			}
			.hero-copy {
				min-height: auto;
				padding: 24px 0 4px;
			}
			.hero h2, .page-hero h2 {
				font-size: clamp(40px, 13vw, 58px);
			}
			.hero p, .page-hero p { font-size: 16px; }
			.panel-grid, .command-list, .roadmap-grid { grid-template-columns: 1fr; }
			.command { flex-direction: column; }
		}
	</style>
</head>
<body>
	<div class="shell">
		<header>
			<a class="brand" href="/" aria-label="${BRAND_CONFIG.name}">
				<div class="mark">A</div>
				<div>
					<h1>${BRAND_CONFIG.name}</h1>
					<p class="sub">Bot petualangan WhatsApp</p>
				</div>
			</a>
			<nav aria-label="Navigasi utama">${renderNav(activePath)}</nav>
		</header>

		<main>${content}</main>

		<footer class="footer">
			<span>${BRAND_CONFIG.name} berjalan sebagai bot WhatsApp dan Discord. Web ini hanya info, dashboard, dan legal.</span>
			<span>
				<a href="/terms">Terms</a>
				&nbsp;|&nbsp;
				<a href="/privacy">Privacy</a>
				&nbsp;|&nbsp;
				<a href="${sourceUrl}">Source</a>
			</span>
		</footer>
	</div>
	<script>
		if (location.hash.includes("access_token=") || location.hash.includes("refresh_token=")) {
			location.replace("/dashboard" + location.hash);
		}
	</script>
	${script}
</body>
</html>`;
}

function renderCommandCards(groups = commandGroups) {
	return groups
		.flatMap((group) =>
			group.commands.map(
				([command, description]) =>
					`<div class="command" data-group="${group.key}" data-command="${command.toLowerCase()} ${description.toLowerCase()}">
						<div><strong>${group.label}</strong><p>${description}</p></div><code>${command}</code>
					</div>`
			)
		)
		.join("");
}

export function renderHomePage() {
	const dashboardUrl = new URL("/dashboard", SUPABASE_CONFIG.publicUrl);

	return renderLayout({
		activePath: "/",
		content: `
			<section class="hero">
				<div class="hero-copy">
					<h2>Aetheria</h2>
					<p>Bot WhatsApp petualangan dengan karakter, guild, misi, inventory, cloud save Google, dan dashboard web untuk melihat progress akun.</p>
					<div class="hero-actions">
						<a class="button" href="${dashboardUrl.pathname}">Buka Dashboard</a>
						<a class="button secondary" href="/commands">Lihat Command</a>
						<a class="button secondary" href="/support">Dukung Bot</a>
					</div>
				</div>
				<div class="preview" aria-label="Preview percakapan Aetheria">
					<div class="preview-head">
						<strong>${BRAND_CONFIG.name}</strong>
						<span class="status"><span class="dot"></span>Online</span>
					</div>
					<div class="preview-body">
						<div class="message user">.misi</div>
						<div class="message bot">Misi harian, mingguan, dan guild tampil dengan progress aktif.</div>
						<div class="message user">.toko</div>
						<div class="message bot">Consumable dan gear kini dipisah agar lebih mudah discan.</div>
						<div class="message user">.profil</div>
						<div class="message bot">HP, energi, XP, gold, gear, guild, dan squad tampil dari save aktif.</div>
					</div>
				</div>
			</section>

			<section class="section">
				<div class="section-head">
					<h2>Portal Aetheria</h2>
					<p>Website ini jadi tempat ringkas untuk cek command, riwayat update, dan rencana fitur sebelum masuk ke dashboard akun.</p>
				</div>
				<div class="panel-grid">
					<a class="card" href="/commands"><h3>Commands</h3><p>Daftar command awal, RPG, ekonomi, dan komunitas dalam format yang mudah dicari.</p></a>
					<a class="card" href="/changelog"><h3>Changelog</h3><p>Catatan update bot, mulai dari RPG interaktif, feedback, ops, sampai cloud save.</p></a>
					<a class="card" href="/roadmap"><h3>Roadmap</h3><p>Rencana jangka panjang seperti crafting expansion, dungeon, boss, title, dan marketplace.</p></a>
					<a class="card" href="/support"><h3>Support</h3><p>Target biaya operasional, paket supporter, sponsor ringan, dan donor wall tanpa pay-to-win.</p></a>
				</div>
			</section>

			<section class="section">
				<div class="section-head">
					<h2>Info Bot</h2>
					<p>Main sebagai guest tetap bisa. Google dipakai sebagai save utama agar akun bisa dipulihkan saat pindah nomor atau device.</p>
				</div>
				<div class="panel-grid">
					<div class="card"><h3>Petualangan</h3><p>Mulai karakter, daftar guild, jelajah zona, lawan monster, serap skill, evolusi ras, dan naik level dari WhatsApp.</p></div>
					<div class="card"><h3>Guild & Squad</h3><p>Guild Petualang membuka jelajah, Guild Pedagang membuka kerja, dan squad disiapkan untuk dungeon serta raid.</p></div>
					<div class="card"><h3>Misi & Ekonomi</h3><p>Misi harian, mingguan, toko, crafting, jual item, dan inventory menjadi loop progres utama.</p></div>
				</div>
			</section>`,
	});
}

export function renderSupportPage() {
	const support = getSupportPageData();
	const paymentLines = support.paymentText
		.split(/\\n|\n/g)
		.map((line) => line.trim())
		.filter(Boolean);

	return renderLayout({
		title: "Support",
		activePath: "/support",
		content: `
			<section class="page-hero">
				<h2>Support</h2>
				<p>Aetheria tetap gratis. Halaman ini dibuat agar biaya operasional, paket supporter, dan sponsor ringan bisa dijelaskan secara transparan.</p>
				<div class="hero-actions">
					<a class="button" href="/commands">Coba Command</a>
					<a class="button secondary" href="/changelog">Lihat Update</a>
				</div>
			</section>

			<section class="section">
				<div class="section-head">
					<h2>Operasional</h2>
					<p>Target ini bisa diubah lewat environment variable agar owner bisa memperbarui angka tanpa deploy fitur baru.</p>
				</div>
				<div class="panel-grid">
					<div class="card">
						<h3>Target Bulanan</h3>
						<div class="kv">
							<span><strong>Terkumpul:</strong> ${escapeHtml(support.progress.currentLabel || "-")}</span>
							<span><strong>Target:</strong> ${escapeHtml(support.progress.targetLabel || "-")}</span>
							<span><strong>Progress:</strong> ${support.progress.percent}%</span>
						</div>
						<div class="progress" aria-label="Progress operasional" style="--value: ${support.progress.percent}%"><span></span></div>
					</div>
					<div class="card">
						<h3>Dipakai Untuk</h3>
						<ul class="list">
							<li>Panel/server bot WhatsApp.</li>
							<li>Website dan dashboard owner.</li>
							<li>Storage session, backup, dan eksperimen fitur.</li>
						</ul>
					</div>
					<div class="card">
						<h3>Cara Bayar</h3>
						<ul class="list">
							${(paymentLines.length ? paymentLines : ["Hubungi owner untuk aktivasi manual."]).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
						</ul>
						${support.paymentUrl ? `<div class="hero-actions"><a class="button secondary" href="${escapeHtml(support.paymentUrl)}">Buka Pembayaran</a></div>` : ""}
					</div>
				</div>
			</section>

			<section class="section">
				<div class="section-head">
					<h2>Paket Support</h2>
					<p>Benefit dibuat kosmetik dan komunitas agar bot tidak berubah menjadi pay-to-win.</p>
				</div>
				<div class="panel-grid">
					${support.packages
						.map(
							(item) => `<article class="card">
								<span class="badge">${escapeHtml(item.price)}</span>
								<h3 style="margin-top: 14px">${escapeHtml(item.name)}</h3>
								<p>${escapeHtml(item.description)}</p>
								<ul class="list">${item.benefits.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join("")}</ul>
							</article>`
						)
						.join("")}
				</div>
			</section>

			<section class="section">
				<div class="section-head">
					<h2>Sponsor Board</h2>
					<p>Slot sponsor dibuat terbatas, transparan, dan aman untuk komunitas. Tidak ada jual data user atau spam mention.</p>
				</div>
				<div class="roadmap-grid">
					${support.sponsorSlots
						.map(
							(slot) => `<article class="card">
								<span class="badge">${escapeHtml(slot.price)}</span>
								<h3 style="margin-top: 14px">${escapeHtml(slot.name)}</h3>
								<p>${escapeHtml(slot.description)}</p>
							</article>`
						)
						.join("")}
				</div>
			</section>`,
	});
}

export function renderCommandsPage() {
	const chips = [
		["all", "Semua"],
		...commandGroups.map((group) => [group.key, group.label]),
	];

	return renderLayout({
		title: "Commands",
		activePath: "/commands",
		content: `
			<section class="page-hero">
				<h2>Commands</h2>
				<p>Cari command Aetheria berdasarkan kategori atau kata kunci.</p>
				<div class="toolbar" role="tablist">
					${chips.map(([key, label]) => `<button class="chip ${key === "all" ? "active" : ""}" data-filter="${key}" type="button">${label}</button>`).join("")}
				</div>
				<div class="toolbar">
					<input id="command-search" class="chip" type="search" placeholder="Cari command..." aria-label="Cari command" />
				</div>
			</section>
			<section class="section">
				<div id="command-list" class="command-list">${renderCommandCards()}</div>
			</section>`,
		script: `<script>
			const commandCards = [...document.querySelectorAll(".command")];
			const chips = [...document.querySelectorAll("[data-filter]")];
			const search = document.getElementById("command-search");
			let active = "all";

			function applyFilter() {
				const query = (search.value || "").toLowerCase().trim();
				for (const card of commandCards) {
					const matchesGroup = active === "all" || card.dataset.group === active;
					const matchesQuery = !query || card.dataset.command.includes(query);
					card.classList.toggle("hidden", !(matchesGroup && matchesQuery));
				}
			}

			chips.forEach((chip) => chip.addEventListener("click", () => {
				active = chip.dataset.filter;
				chips.forEach((item) => item.classList.toggle("active", item === chip));
				applyFilter();
			}));
			search.addEventListener("input", applyFilter);
		</script>`,
	});
}

export function renderChangelogPage() {
	return renderLayout({
		title: "Changelog",
		activePath: "/changelog",
		content: `
			<section class="page-hero">
				<h2>Changelog</h2>
				<p>Riwayat update penting Aetheria, dibuat ringkas agar Aethers mudah mengikuti perubahan.</p>
			</section>
			<section class="timeline">
				${CHANGELOG_ENTRIES.map(
					(
						entry,
						index
					) => `<article class="timeline-item ${index === 0 ? "open" : ""}">
							<button class="timeline-button" type="button">
								<span><strong>${entry.version}</strong><p>${entry.date}</p></span>
								<span class="badge">${entry.tag}</span>
							</button>
							<div class="timeline-body">
								<ul>${entry.items.map((item) => `<li>${item}</li>`).join("")}</ul>
							</div>
						</article>`
				).join("")}
			</section>`,
		script: `<script>
			document.querySelectorAll(".timeline-button").forEach((button) => {
				button.addEventListener("click", () => {
					button.closest(".timeline-item").classList.toggle("open");
				});
			});
		</script>`,
	});
}

export function renderRoadmapPage() {
	const stages = ["all", "Next", "Planned", "Later"];

	return renderLayout({
		title: "Roadmap",
		activePath: "/roadmap",
		content: `
			<section class="page-hero">
				<h2>Roadmap</h2>
				<p>Rencana fitur jangka panjang Aetheria setelah fondasi misi, toko, guild, dan dashboard mulai stabil.</p>
				<div class="toolbar">
					${stages.map((stage) => `<button class="chip ${stage === "all" ? "active" : ""}" data-stage="${stage}" type="button">${stage === "all" ? "Semua" : stage}</button>`).join("")}
				</div>
			</section>
			<section class="roadmap-grid">
				${roadmap
					.map(
						(
							item
						) => `<article class="card" data-roadmap-stage="${item.stage}">
							<span class="badge">${item.stage}</span>
							<h3 style="margin-top: 14px">${item.title}</h3>
							<p>${item.description}</p>
						</article>`
					)
					.join("")}
			</section>`,
		script: `<script>
			const stageButtons = [...document.querySelectorAll("[data-stage]")];
			const roadmapCards = [...document.querySelectorAll("[data-roadmap-stage]")];
			stageButtons.forEach((button) => button.addEventListener("click", () => {
				const stage = button.dataset.stage;
				stageButtons.forEach((item) => item.classList.toggle("active", item === button));
				roadmapCards.forEach((card) => {
					card.classList.toggle("hidden", stage !== "all" && card.dataset.roadmapStage !== stage);
				});
			}));
		</script>`,
	});
}

export function renderTermsPage() {
	return renderLayout({
		title: "Terms of Service",
		activePath: "/support",
		content: `
			<section class="page-hero">
				<h2>Terms</h2>
				<p>Ketentuan penggunaan Aetheria untuk bot WhatsApp, bot Discord, website, dashboard, dan fitur RPG komunitas.</p>
			</section>
			<section class="section">
				<div class="panel-grid">
					<article class="card">
						<h3>Penggunaan Bot</h3>
						<ul class="list">
							<li>Aetheria adalah bot komunitas dan RPG ringan. Fitur dapat berubah, ditunda, atau dimatikan jika diperlukan untuk stabilitas.</li>
							<li>Pengguna wajib mengikuti aturan grup/server tempat Aetheria dipasang.</li>
							<li>Dilarang memakai Aetheria untuk spam, scam, phishing, doxxing, pelecehan, konten ilegal, atau penyalahgunaan platform.</li>
						</ul>
					</article>
					<article class="card">
						<h3>Progress RPG</h3>
						<ul class="list">
							<li>Progress RPG disediakan apa adanya dan dapat disesuaikan untuk balancing, bug fix, atau migrasi data.</li>
							<li>Eksploit, automation berlebihan, dan manipulasi data dapat menyebabkan reset progress, pembatasan fitur, atau blacklist.</li>
							<li>Fitur support, sponsor, atau donasi tidak boleh menjadi pay-to-win.</li>
						</ul>
					</article>
					<article class="card">
						<h3>Operasional</h3>
						<ul class="list">
							<li>Owner dapat membatasi command, mengeluarkan bot dari grup/server, atau menghentikan akses jika bot mengganggu komunitas.</li>
							<li>Aetheria tidak menjamin uptime penuh, karena bot berjalan dengan sumber daya operasional terbatas.</li>
							<li>Dengan memakai Aetheria, kamu setuju pada terms ini dan kebijakan privasi Aetheria.</li>
						</ul>
					</article>
				</div>
			</section>
			<section class="section">
				<div class="card">
					<h3>Kontak</h3>
					<p>Untuk laporan bug, permintaan penghapusan data, atau komplain komunitas, hubungi owner melalui command <code>.feedback</code>, <code>.bug</code>, atau channel kontak yang disediakan di grup/server Aetheria.</p>
				</div>
			</section>`,
	});
}

export function renderPrivacyPage() {
	return renderLayout({
		title: "Privacy Policy",
		activePath: "/support",
		content: `
			<section class="page-hero">
				<h2>Privacy</h2>
				<p>Kebijakan privasi Aetheria menjelaskan data minimum yang dipakai agar bot, RPG, dashboard, dan integrasi Discord berjalan.</p>
			</section>
			<section class="section">
				<div class="panel-grid">
					<article class="card">
						<h3>Data yang Diproses</h3>
						<ul class="list">
							<li>ID WhatsApp atau Discord user untuk menyimpan progress, command, cooldown, dan preferensi bot.</li>
							<li>Nama tampilan publik dari WhatsApp atau Discord untuk label profil, leaderboard, guild, dan log komunitas.</li>
							<li>Data RPG seperti karakter, level, XP, gold, inventory, guild, squad, achievement, dan riwayat aktivitas bot.</li>
							<li>Pesan yang dikirim sebagai command, feedback, quote, memory grup, agenda, atau operasi dashboard owner.</li>
						</ul>
					</article>
					<article class="card">
						<h3>Penggunaan Data</h3>
						<ul class="list">
							<li>Menjalankan command, menyimpan progress RPG, menampilkan leaderboard, dan menghubungkan akun ke dashboard.</li>
							<li>Moderasi komunitas, debugging, anti-spam, audit error, dan pengiriman update yang diminta owner.</li>
							<li>Aetheria tidak menjual data pengguna dan tidak memakai data chat untuk iklan pihak ketiga.</li>
						</ul>
					</article>
					<article class="card">
						<h3>Penyimpanan & Kontrol</h3>
						<ul class="list">
							<li>Data dapat tersimpan di storage lokal bot, Supabase, atau database yang dikonfigurasi owner.</li>
							<li>Pengguna dapat meminta penghapusan data melalui owner, dengan catatan beberapa log teknis bisa tetap tersimpan sementara untuk keamanan.</li>
							<li>Jangan mengirim token, password, kode OTP, atau informasi sensitif lain ke bot.</li>
						</ul>
					</article>
				</div>
			</section>
			<section class="section">
				<div class="card">
					<h3>Discord</h3>
					<p>Untuk Discord, Aetheria menggunakan slash command dan ID akun Discord sebagai identitas RPG. Message Content Intent tidak diperlukan untuk mode Discord saat ini, sehingga bot tidak perlu membaca semua pesan server.</p>
				</div>
			</section>`,
	});
}

export function renderDiscordLinkedRolesPage() {
	return renderLayout({
		title: "Discord Linked Roles",
		activePath: "/support",
		content: `
			<section class="page-hero">
				<h2>Linked Roles</h2>
				<p>Halaman ini disiapkan sebagai verification URL Discord untuk role komunitas Aetheria. Integrasi role otomatis akan diaktifkan setelah OAuth Discord dan metadata role siap.</p>
				<div class="hero-actions">
					<a class="button" href="/commands">Lihat Command</a>
					<a class="button secondary" href="/privacy">Privacy Policy</a>
				</div>
			</section>
			<section class="section">
				<div class="panel-grid">
					<div class="card">
						<h3>Status</h3>
						<p>Linked Roles belum aktif penuh. Untuk sekarang, role Discord bisa diatur manual oleh admin server berdasarkan progress Aetheria.</p>
					</div>
					<div class="card">
						<h3>Rencana Metadata</h3>
						<ul class="list">
							<li>Level karakter minimum.</li>
							<li>Daily streak.</li>
							<li>Guild Petualang atau Pedagang.</li>
							<li>Supporter badge tanpa pay-to-win.</li>
						</ul>
					</div>
					<div class="card">
						<h3>Mulai Main</h3>
						<p>Gunakan <code>/start</code>, <code>/daily</code>, <code>/quest</code>, dan <code>/leaderboard</code> di Discord setelah bot diinvite ke server.</p>
					</div>
				</div>
			</section>`,
	});
}
