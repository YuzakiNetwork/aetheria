import { BRAND_CONFIG } from "#config/brand";
import { buildWaMeLink, normalizeJidNumber } from "#lib/community";

const DEFAULT_WEBSITE_URL =
	process.env.AETHERIA_PUBLIC_URL ||
	process.env.BOT_WEBSITE_URL ||
	"https://aetheria-theta.vercel.app/";

export const DEFAULT_NEWSLETTER_JID =
	process.env.AETHERIA_NEWSLETTER_JID ||
	process.env.BOT_NEWSLETTER_JID ||
	"120363386413320563@newsletter";

export const CHANGELOG_ENTRIES = [
	{
		version: "WhatsApp Command Finder",
		date: "14 Juni 2026",
		tag: "WhatsApp",
		items: [
			"Command .fitur ditambahkan sebagai hub ringkas untuk menemukan fitur tanpa membaca help panjang.",
			"Command .cari ditambahkan untuk mencari fitur berdasarkan nama command, alias, kategori, deskripsi, atau usage.",
			".fitur bisa menampilkan rekomendasi cepat, kategori command, detail command, dan hasil pencarian.",
			"Output mendukung list message jika client WhatsApp mendukung, dengan fallback teks biasa.",
			"Command owner dan command hidden tidak muncul untuk user biasa agar daftar fitur tetap aman dan rapi.",
		],
		commands: [
			"fitur",
			"fitur rpg",
			"fitur cari youtube",
			"fitur daily",
			"cari downloader",
		],
	},
	{
		version: "Discord RPG Starter",
		date: "13 Juni 2026",
		tag: "Discord",
		items: [
			"Discord sekarang punya command RPG awal, bukan hanya status/update.",
			"Command /start membuat karakter Discord dengan identitas player terpisah dan aman dari JID WhatsApp.",
			"Command /rpg, /profile, /daily, /quest, dan /leaderboard memakai logic RPG core yang sama dengan WhatsApp.",
			"Command /guild ditambahkan agar pemain Discord bisa daftar Guild Petualang atau Guild Pedagang.",
			"Command /adventure, /work, dan /heal membuka loop RPG ringan langsung dari Discord.",
			"Invite Discord sekarang bisa dibuat dari DISCORD_APPLICATION_ID tanpa perlu guild id.",
		],
		commands: [
			"/rpg",
			"/start",
			"/profile",
			"/daily",
			"/quest",
			"/guild",
			"/adventure",
			"/work",
			"/heal",
			"/leaderboard",
		],
	},
	{
		version: "Discord Adapter Foundation",
		date: "13 Juni 2026",
		tag: "Platform",
		items: [
			"Adapter Discord ditambahkan sebagai platform kedua Aetheria tanpa mematikan runtime WhatsApp.",
			"Discord memakai slash command native agar tidak butuh Message Content Intent untuk tahap awal.",
			"Command awal tersedia: /ping, /status, /update, /help, /invite, dan /support.",
			"Slash command bisa diregister global atau khusus guild testing lewat DISCORD_GUILD_ID.",
			"Adapter bersifat optional: jika DISCORD_BOT_TOKEN belum diisi, bot WhatsApp tetap jalan normal.",
			"README dan .env.example ditambah panduan setup Discord Developer Portal.",
		],
		commands: [
			"/ping",
			"/status",
			"/update",
			"/help",
			"/invite",
			"/support",
		],
	},
	{
		version: "Group Community Suite",
		date: "12 Juni 2026",
		tag: "Community",
		items: [
			"Welcome Kit grup ditambahkan lewat .welcome/.welcomekit untuk menyambut member baru otomatis.",
			"Template welcome mendukung placeholder {mention}, {group}, {description}, {prefix}, dan {bot}.",
			"Auto Topic ditambahkan lewat .topik/.topic untuk memancing obrolan manual atau otomatis harian.",
			"Generator topik membaca nama/deskripsi grup secara rule-based tanpa biaya API AI.",
			"Agenda Grup ditambahkan lewat .event/.agenda dengan native event message Baileys saat event dibuat.",
			"Agenda grup punya reminder otomatis sebelum mulai agar event komunitas tidak mudah tenggelam.",
		],
		commands: [
			"welcome on",
			"welcome preview",
			"welcome set <teks>",
			"topik",
			"topik on",
			"event add Judul | besok 20:00 | deskripsi",
			"event list",
		],
	},
	{
		version: "Quote & Memory Group",
		date: "12 Juni 2026",
		tag: "Community",
		items: [
			"Command .quote/.quotes ditambahkan untuk menyimpan quote teks/caption dari pesan yang direply.",
			"Command .memory/.memori ditambahkan untuk menyimpan catatan, inside joke, rules pendek, atau momen penting grup.",
			"Quote dan memory bisa dicari dengan .quote search <kata>, .memory search <kata>, atau tag seperti #lucu dan #event.",
			"Setiap grup punya storage sendiri dengan batas 100 item agar database tetap ringan.",
			"Admin grup bisa menghapus item dengan .quote delete <id> atau .memory delete <id>.",
			"Output memakai tombol/list fallback agar random, list, dan search mudah dipakai dari WhatsApp.",
		],
		commands: [
			"quote add #lucu",
			"quote random",
			"quote list",
			"quote search <kata>",
			"memory add <teks> #event",
			"memory random",
		],
	},
	{
		version: "Weekly Hall of Fame",
		date: "12 Juni 2026",
		tag: "Community",
		items: [
			"Command .hof/.halloffame ditambahkan untuk melihat Weekly Hall of Fame RPG dari WhatsApp.",
			"Hall of Fame menampilkan Top Adventurer, Daily Streak, Hunter Aktif, Gold Holder, dan Worker berdasarkan snapshot RPG aktif.",
			"Bot sekarang punya periodic task halloffame untuk mengirim recap mingguan otomatis ke newsletter Aetheria.",
			"Owner bisa mengirim manual dengan .hof send atau .hof send <target> jika ingin publish di luar jadwal.",
			"Owner bisa mengecek jadwal dengan .hof status dan mematikan otomatis lewat .setting halloffame off.",
			"Newsletter update sekarang punya link bot langsung ke command .hof agar mudah dibagikan.",
		],
		commands: [
			"hof",
			"halloffame",
			"hof status",
			"hof send",
			"setting halloffame off",
		],
	},
	{
		version: "Comeback Retention Loop",
		date: "11 Juni 2026",
		tag: "Retention",
		items: [
			"Command .kembali/.comeback/.balik ditambahkan sebagai pintu cepat untuk user yang lama tidak aktif.",
			"Daily sekarang memberi Return Supply otomatis kalau pemain absen 3 hari atau lebih.",
			"Return Supply berisi gold, XP, potion, ether, dan Field Ration untuk comeback lebih lama, dengan skala dibatasi agar tidak pay-to-win.",
			"Hasil .daily sekarang menampilkan bagian Return Supply supaya bonus comeback terlihat jelas di chat.",
			"RPG Hub menampilkan menu Kembali agar user lama mudah diarahkan dari .rpg.",
			"Loop comeback diarahkan ke .daily, .tavern claim, dan .rpg agar pemain langsung punya langkah setelah balik.",
		],
		commands: [
			"kembali",
			"comeback",
			"balik",
			"daily",
			"tavern claim",
			"rpg",
		],
	},
	{
		version: "Supporter & Sponsor Board",
		date: "11 Juni 2026",
		tag: "Monetization",
		items: [
			"Command .donasi/.support ditambahkan untuk menjelaskan cara bantu biaya operasional bot.",
			"Command .donasi wall menampilkan supporter wall dari entitlement Supporter aktif.",
			"Command .sponsor ditambahkan untuk slot sponsor ringan tanpa spam dan tanpa pay-to-win.",
			"Website mendapat halaman /support berisi target operasional, paket supporter, cara bayar, dan sponsor board.",
			"Profil RPG sekarang menampilkan label Supporter/Aether Pass jika entitlement aktif di Supabase.",
			"Shortcut .status dan .invite sekarang menampilkan .donasi agar jalur support mudah ditemukan.",
		],
		commands: [
			"donasi",
			"donasi wall",
			"donasi klaim",
			"sponsor",
			"supporter",
			"profile",
		],
	},
	{
		version: "Pinterest Album & YouTube Fix",
		date: "9 Juni 2026",
		tag: "Downloader",
		items: [
			"Command .pinterest dan alias .pin sekarang mengirim hasil multi-image/video sebagai album message Baileys.",
			"Pinterest search dan Lens membatasi album ke maksimal 10 media agar lebih stabil di WhatsApp.",
			"Alias .pin dikembalikan untuk Pinterest; command pin pesan grup dipindah ke .pinmsg dan .unpinmsg agar tidak bentrok.",
			"Command .yt/.youtube/.play sekarang menormalisasi link YouTube tanpa https://.",
			"Downloader YouTube sekarang mencoba API utama terlebih dahulu, lalu fallback ke yt-dlp lokal jika API eksternal gagal.",
			"Hasil search YouTube sekarang lebih aman terhadap response kosong atau bentuk data yang berubah.",
		],
		commands: [
			"pinterest wallpaper fantasy -10",
			"pin anime landscape -5",
			"yt youtu.be/<id>",
			"yt lofi aetheria",
			"pinmsg 1d",
			"unpinmsg",
		],
	},
	{
		version: "Baileys Feature Expansion",
		date: "9 Juni 2026",
		tag: "Baileys",
		items: [
			"Command .poll ditambahkan untuk membuat WhatsApp native poll dari chat biasa.",
			"Command .pinmsg, .unpinmsg, .keep, dan .unkeep ditambahkan untuk admin grup dengan payload native Baileys.",
			"Command .ai dan .gpt di private chat sekarang memakai AI icon payload jika client mendukung.",
			"Command .hidetag sekarang memanfaatkan mentionAll native sambil tetap membawa fallback mentions manual.",
			"Owner mendapat .newsletter untuk metadata, subscriber count, admin count, subscribed list, dan reaction newsletter.",
			"Owner mendapat .baileyslab untuk mengetes edit message, view once, spoiler, ephemeral, album, group status, contact, group invite, external ad reply, secure label, dan findUserId.",
		],
		commands: [
			"poll Main apa? | Land | Catur | Ular",
			"pinmsg 1d",
			"unpinmsg",
			"keep",
			"newsletter info",
			"baileyslab album",
			"baileyslab jid <nomor>",
		],
	},
	{
		version: "Visual Game Boards",
		date: "9 Juni 2026",
		tag: "Game UI",
		items: [
			"Game Aetheria Land sekarang mengirim board PNG berisi petak, pemilik wilayah, posisi pemain, giliran, gold, dan pembelian yang tertunda.",
			"Game Catur Aetheria sekarang mengirim papan 8x8 visual dengan warna kotak, bidak, giliran, dan history gerakan terakhir.",
			"Game Ular Tangga sekarang mengirim board PNG 50 petak dengan marker pemain serta garis tangga dan ular.",
			"Visual board dikirim sebagai image message dengan caption ringkasan agar lebih mudah dipahami di grup.",
			"Jika render atau upload gambar gagal, command tetap fallback ke teks/interaktif seperti sebelumnya.",
		],
		commands: [
			"land board",
			"land roll",
			"chess board",
			"chess move e2e4",
			"ular board",
			"ular roll",
		],
	},
	{
		version: "Tabletop Games",
		date: "8 Juni 2026",
		tag: "Game",
		items: [
			"Aetheria Land hadir sebagai game ekonomi grup: buat lobby, join, mulai, roll dadu, beli wilayah, bayar sewa, dan cari pemenang.",
			"Catur Aetheria hadir sebagai game turn-based dengan notasi e2e4, validasi gerak bidak dasar, capture, promosi pion, resign, dan board teks.",
			"Ular Tangga Aetheria hadir sebagai game dadu ringan: lobby grup, tangga, ular, giliran otomatis, dan finish di petak 50.",
			"RPG Hub sekarang punya bagian Tabletop Grup agar game baru mudah ditemukan dari command .rpg.",
			"Kategori Help mendapat kategori Game untuk melihat command .land, .chess, dan .ular.",
		],
		commands: [
			"land start",
			"land join",
			"land roll",
			"chess start",
			"chess move e2e4",
			"ular start",
			"ular roll",
		],
	},
	{
		version: "Rich Response Update Center",
		date: "8 Juni 2026",
		tag: "UI",
		items: [
			"Command .update sekarang mencoba rich response untuk changelog yang lebih rapi.",
			"Detail update memakai kombinasi teks, table command, dan link/citation.",
			"Command .status juga mendapat tampilan rich response berisi table runtime dan shortcut.",
			"Inline image rich response belum dipakai untuk publik karena beberapa client WhatsApp belum merender gambarnya.",
			"Fallback interactive/text tetap aktif jika rich response gagal dikirim.",
		],
		commands: ["update", "update latest", "status"],
	},
	{
		version: "Owner Web Update Sender",
		date: "6 Juni 2026",
		tag: "Owner Web",
		items: [
			"Dashboard owner sekarang punya panel Update Newsletter untuk mengirim pengumuman langsung dari website.",
			"Target default mengarah ke newsletter Aetheria, tetapi bisa diganti ke grup, user, atau channel lain.",
			"Tombol Isi Latest mengambil template update terbaru dari sumber changelog yang sama dengan command .update dan .announce.",
			"Pengiriman dari Vercel masuk ke command queue Supabase, lalu bot yang online mengirim pesan ke target.",
			"Dashboard lokal di runtime bot bisa mengirim update langsung lewat socket jika bot sedang online.",
		],
		commands: ["update", "announce preview", "announce latest"],
	},
	{
		version: "Tavern Board",
		date: "6 Juni 2026",
		tag: "RPG",
		items: [
			"Command .tavern membuka papan task harian dan mingguan.",
			"Tavern Board membaca aktivitas utama seperti daily, jelajah, kerja, craft, boss, dungeon, dan upgrade.",
			"Command .tavern claim mengambil semua reward Tavern yang sudah siap.",
			"Reward Tavern memberi gold, XP, potion, ether, material, Field Ration, dan Pet Essence sesuai task.",
			"RPG Hub, guide, dan website command list sudah menampilkan akses Tavern Board.",
		],
		commands: [
			"tavern",
			"tavern claim",
			"tavern daily",
			"tavern weekly",
			"rpg",
		],
	},
	{
		version: "Daily Streak & Invite Tools",
		date: "5 Juni 2026",
		tag: "RPG + Community",
		items: [
			"Daily reward sekarang punya streak harian dengan bonus gold dan XP bertahap.",
			"Streak hari ke-3 memberi Ether tambahan, dan milestone 7 hari memberi Pet Essence.",
			"Profil, guide, dan progress checklist sekarang menampilkan status Daily Streak.",
			"Command .invite, .share, .ajak, dan .promosi membuat teks ajakan untuk membagikan bot ke teman.",
			"Halaman command website ikut menampilkan command komunitas terbaru.",
		],
		commands: ["daily", "profil", "progress", "invite", "update"],
	},
	{
		version: "Community & Update Center",
		date: "4 Juni 2026",
		tag: "Community",
		items: [
			"Command .update untuk membaca update terbaru langsung dari WhatsApp.",
			"Command .status menampilkan kondisi bot, shortcut utama, link bot, dan website.",
			"Command .feedback, .bug, dan .saran mengirim masukan user langsung ke owner.",
			"Command owner .ops memberi ringkasan plugin, queue, user, grup, mode, uptime, dan memory.",
			"Command owner .announce bisa preview atau kirim teks update terbaru ke newsletter/target chat.",
		],
		commands: ["update", "status", "feedback <pesan>", "invite"],
	},
	{
		version: "Interactive RPG Hub",
		date: "Update terbaru",
		tag: "RPG",
		items: [
			"Command .rpg dan .aetheria menjadi pusat aksi RPG interaktif.",
			"Menu RPG memakai tombol/list untuk profil, guide, progress, jelajah, dungeon, boss, misi, inventory, toko, craft, guild, squad, bestiary, dan skill.",
			"Error RPG seperti HP rendah, energi kurang, item habis, atau gold kurang memberi tombol solusi.",
			"Baileys diperbarui ke 0.4.0 untuk dukungan interactive message yang lebih luas.",
		],
	},
	{
		version: "Misi & Toko",
		date: "Gameplay",
		tag: "Gameplay",
		items: [
			"Command .misi untuk harian, mingguan, dan misi guild.",
			"Reward misi memberi gold, XP, item, dan Guild Point.",
			"Toko diperluas dengan Hi-Potion, Greater Ether, Field Ration, Guardian Armor, dan Merchant Ring.",
			"Crafting mendapat recipe baru untuk item toko menengah.",
		],
		commands: ["misi", "toko", "craft list", "inventory"],
	},
	{
		version: "Guild & Squad",
		date: "Fondasi party",
		tag: "Social",
		items: [
			"Guild Petualang membuka akses jelajah.",
			"Guild Pedagang membuka akses kerja.",
			"Squad disiapkan sebagai fondasi dungeon dan raid.",
		],
		commands: ["guild", "squad", "dungeon", "boss"],
	},
	{
		version: "Cloud Save",
		date: "Account linking",
		tag: "Account",
		items: [
			"Login Google melalui Supabase Auth.",
			"Dashboard web membaca karakter dari Supabase.",
			"Restore cloud save untuk pindah nomor atau device.",
		],
		commands: ["login", "akun", "restore"],
	},
];

export function getLatestUpdate() {
	return CHANGELOG_ENTRIES[0];
}

function normalizePrefix(prefix) {
	return typeof prefix === "string" && prefix ? prefix : ".";
}

function formatRelatedCommand(command = "", prefix = ".") {
	const text = String(command || "").trim();

	if (!text) {
		return "";
	}

	return text.startsWith("/") ? text : `${normalizePrefix(prefix)}${text}`;
}

function getWebsitePath(path = "") {
	const base = DEFAULT_WEBSITE_URL.replace(/\/+$/, "");
	const suffix = String(path || "").replace(/^\/+/, "");

	return suffix ? `${base}/${suffix}` : base;
}

export function formatUpdateList(prefix = ".") {
	const safePrefix = normalizePrefix(prefix);
	const lines = [
		`📰 *Update ${BRAND_CONFIG.name}*`,
		"━━━━━━━━━━━━━━━━━━━━",
		"Update terbaru dan catatan rilis penting.",
		"",
	];

	for (const [index, entry] of CHANGELOG_ENTRIES.entries()) {
		lines.push(
			`${index + 1}. *${entry.version}*`,
			`   ${entry.date} • ${entry.tag}`
		);
	}

	lines.push(
		"",
		`Detail terbaru: \`${safePrefix}update latest\``,
		`Detail nomor: \`${safePrefix}update 2\``
	);

	return lines.join("\n");
}

export function formatUpdateDetail(entry = getLatestUpdate(), prefix = ".") {
	const safePrefix = normalizePrefix(prefix);
	const commands = Array.isArray(entry.commands)
		? entry.commands
		: ["update", "status", "feedback <pesan>"];
	const lines = [
		`📰 *${entry.version}*`,
		"━━━━━━━━━━━━━━━━━━━━",
		`${entry.date} • ${entry.tag}`,
		"",
		...entry.items.map((item) => `- ${item}`),
		"",
		"*Command Terkait*",
		...commands.map(
			(command) => `- ${formatRelatedCommand(command, safePrefix)}`
		),
	];

	return lines.join("\n");
}

export function formatUpdateListRichResponse(prefix = ".") {
	const safePrefix = normalizePrefix(prefix);

	return {
		disclaimerText: `${BRAND_CONFIG.name} Update Center`,
		headerText: `## Update ${BRAND_CONFIG.name}`,
		contentText:
			"Changelog terbaru sekarang ditampilkan dengan rich response agar lebih mudah discan langsung dari WhatsApp.",
		title: "Changelog",
		table: [
			["No", "Update", "Tag"],
			...CHANGELOG_ENTRIES.slice(0, 8).map((entry, index) => [
				String(index + 1),
				entry.version,
				entry.tag,
			]),
		],
		links: [
			{
				text: "Buka changelog website",
				url: getWebsitePath("changelog"),
				title: `${BRAND_CONFIG.name} Changelog`,
				displayName: "Aetheria Web",
				sources: [
					{
						displayName: "Aetheria Web",
						subtitle: "Changelog publik",
						url: getWebsitePath("changelog"),
					},
				],
			},
		],
		footerText: `Detail: ${safePrefix}update latest | Nomor: ${safePrefix}update 2`,
		fallbackText: formatUpdateList(safePrefix),
	};
}

export function formatUpdateDetailRichResponse(
	entry = getLatestUpdate(),
	prefix = "."
) {
	const safePrefix = normalizePrefix(prefix);
	const commands = Array.isArray(entry.commands)
		? entry.commands
		: ["update", "status", "feedback <pesan>"];

	return {
		disclaimerText: `${BRAND_CONFIG.name} Update Detail`,
		headerText: `## ${entry.version}`,
		contentText: [
			`${entry.date} • ${entry.tag}`,
			"",
			...entry.items.map((item) => `- ${item}`),
		].join("\n"),
		title: "Command Terkait",
		table: [
			["Command", "Kegunaan"],
			...commands
				.slice(0, 8)
				.map((command) => [
					formatRelatedCommand(command, safePrefix),
					"Coba di chat",
				]),
		],
		links: [
			{
				text: "Lihat update lain",
				url: getWebsitePath("changelog"),
				title: `${BRAND_CONFIG.name} Changelog`,
				displayName: "Aetheria Web",
				sources: [
					{
						displayName: "Aetheria Web",
						subtitle: "Daftar update",
						url: getWebsitePath("changelog"),
					},
				],
			},
		],
		footerText: `Daftar update: ${safePrefix}update`,
		fallbackText: formatUpdateDetail(entry, safePrefix),
	};
}

export function resolveUpdateEntry(value) {
	const input = String(value || "latest")
		.toLowerCase()
		.trim();

	if (!input || ["latest", "baru", "terbaru"].includes(input)) {
		return getLatestUpdate();
	}

	const number = Number(input);

	if (Number.isInteger(number) && number >= 1) {
		return CHANGELOG_ENTRIES[number - 1] || null;
	}

	return (
		CHANGELOG_ENTRIES.find((entry) =>
			entry.version.toLowerCase().includes(input)
		) || null
	);
}

export function formatNewsletterAnnouncement({
	botNumber = process.env.BOT_NUMBER || "",
	prefix = ".",
	websiteUrl = DEFAULT_WEBSITE_URL,
} = {}) {
	const safePrefix = normalizePrefix(prefix);
	const botLink = buildWaMeLink(
		normalizeJidNumber(botNumber),
		`${safePrefix}update`
	);
	const lines = [
		"🌌 *AETHERIA UPDATE — DISCORD RPG STARTER*",
		"",
		"Aethers, Discord Aetheria sekarang bukan cuma status/update. Slash command RPG awal sudah masuk agar pemain bisa mulai karakter dan menjalankan loop ringan langsung dari server Discord.",
		"",
		"*1. Start Karakter di Discord*",
		"Pemain bisa memakai `/start class:Warrior` untuk membuat karakter Discord dengan identity terpisah dari JID WhatsApp.",
		"",
		"*2. RPG Hub & Profile*",
		"`/rpg` membuka arahan progress, dan `/profile` menampilkan status karakter dengan data RPG core yang sama.",
		"",
		"*3. Daily & Quest*",
		"`/daily` sudah bisa klaim reward harian. `/quest` bisa lihat misi dan claim reward siap.",
		"",
		"*4. Guild, Adventure, Work*",
		"`/guild` membuka daftar Guild Petualang atau Pedagang. Setelah itu pemain bisa pakai `/adventure` atau `/work`.",
		"",
		"*5. Heal & Leaderboard*",
		"`/heal` bisa pakai potion/ether, dan `/leaderboard` menampilkan ranking lintas platform.",
		"",
		"*6. Guild ID Tidak Wajib*",
		"DISCORD_GUILD_ID boleh dikosongkan. Command akan diregister global memakai DISCORD_APPLICATION_ID.",
		"",
		"*Cara Coba*",
		"- /start class:Warrior",
		"- /rpg",
		"- /daily",
		"- /quest",
		"- /guild action:join guild:Petualang",
		"- /adventure",
		"- /leaderboard",
		"",
		"*Link Bot WhatsApp*",
		botLink || "-",
		"",
		"*Website*",
		`${websiteUrl.replace(/\/$/, "")}/changelog`,
		"",
		"Ini masih tahap starter, tapi Discord sekarang sudah punya loop RPG yang bisa dimainkan. Berikutnya inventory, shop, boss, dan fitur sosial bisa diangkat bertahap.",
	];

	return lines.join("\n");
}
