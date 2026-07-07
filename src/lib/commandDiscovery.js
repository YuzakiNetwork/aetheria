import { BRAND_CONFIG } from "#config/brand";

const DIVIDER = "━━━━━━━━━━━━━━━━━━━━";
const MAX_RESULTS = 12;

const CATEGORY_META = {
	akun: { icon: "🔐", label: "Akun" },
	community: { icon: "💬", label: "Komunitas" },
	convert: { icon: "🎨", label: "Convert" },
	downloader: { icon: "⬇️", label: "Downloader" },
	game: { icon: "🎲", label: "Game Grup" },
	group: { icon: "👥", label: "Grup" },
	info: { icon: "ℹ️", label: "Info" },
	misc: { icon: "🧩", label: "Lainnya" },
	owner: { icon: "👑", label: "Owner" },
	petualangan: { icon: "⚔️", label: "RPG" },
	rpg: { icon: "⚔️", label: "RPG" },
	tools: { icon: "🛠️", label: "Tools" },
};

const CATEGORY_ALIASES = {
	download: "downloader",
	games: "game",
	grup: "group",
	komunitas: "community",
	petualangan: "rpg",
	roleplay: "rpg",
};

const RECOMMENDED_COMMANDS = [
	"rpg",
	"mulai",
	"daily",
	"misi",
	"profil",
	"progress",
	"tavern",
	"dungeon",
	"boss",
	"hof",
	"status",
	"update",
	"invite",
	"feedback",
	"donasi",
	"quote",
	"memory",
	"welcome",
	"topik",
	"event",
	"yt",
	"pinterest",
	"tiktok",
	"sticker",
];

const collator = new Intl.Collator("id", {
	numeric: true,
	sensitivity: "base",
});

function normalize(value = "") {
	return String(value || "")
		.toLowerCase()
		.trim();
}

function escapeRegex(value = "") {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getCategoryKey(category = "general") {
	const key = normalize(category || "general");

	return CATEGORY_ALIASES[key] || key || "general";
}

export function getCommandCategoryMeta(category = "general") {
	const key = getCategoryKey(category);

	return (
		CATEGORY_META[key] || {
			icon: "📌",
			label: key.charAt(0).toUpperCase() + key.slice(1),
		}
	);
}

function isVisiblePlugin(plugin = {}, { isOwner = false } = {}) {
	return Boolean(
		plugin &&
		Array.isArray(plugin.command) &&
		plugin.command.length &&
		!plugin.hidden &&
		(!plugin.owner || isOwner)
	);
}

export function getVisibleCommandPlugins(plugins = [], options = {}) {
	return plugins
		.filter((plugin) => isVisiblePlugin(plugin, options))
		.slice()
		.sort((a, b) =>
			collator.compare(a.command?.[0] || "", b.command?.[0] || "")
		);
}

function primaryCommand(plugin = {}) {
	return String(plugin.command?.[0] || "").trim();
}

function commandAliases(plugin = {}) {
	return (plugin.command || [])
		.map((command) => String(command || "").trim())
		.filter(Boolean);
}

function pluginSearchText(plugin = {}) {
	return [
		plugin.name,
		plugin.description,
		plugin.category,
		...commandAliases(plugin),
		Array.isArray(plugin.usage) ? plugin.usage.join(" ") : plugin.usage,
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();
}

export function groupCommandPluginsByCategory(plugins = [], options = {}) {
	const groups = new Map();

	for (const plugin of getVisibleCommandPlugins(plugins, options)) {
		const category = getCategoryKey(plugin.category || "general");

		if (!groups.has(category)) {
			groups.set(category, []);
		}

		groups.get(category).push(plugin);
	}

	return [...groups.entries()].sort(([a], [b]) => collator.compare(a, b));
}

export function findCommandPlugin(plugins = [], command = "", options = {}) {
	const query = normalize(command);

	if (!query) {
		return null;
	}

	return (
		getVisibleCommandPlugins(plugins, options).find((plugin) =>
			commandAliases(plugin).some((alias) => normalize(alias) === query)
		) || null
	);
}

export function searchCommandPlugins(plugins = [], query = "", options = {}) {
	const normalizedQuery = normalize(query);

	if (!normalizedQuery) {
		return [];
	}

	const terms = normalizedQuery.split(/\s+/).filter(Boolean);

	return getVisibleCommandPlugins(plugins, options)
		.map((plugin) => {
			const text = pluginSearchText(plugin);
			const commandMatch = commandAliases(plugin).some((alias) =>
				normalize(alias).includes(normalizedQuery)
			);
			const allTermsMatch = terms.every((term) => text.includes(term));
			const score =
				(commandMatch ? 50 : 0) +
				(allTermsMatch ? 20 : 0) +
				terms.filter((term) => text.includes(term)).length;

			return { plugin, score };
		})
		.filter((entry) => entry.score > 0)
		.sort(
			(a, b) =>
				b.score - a.score ||
				collator.compare(
					primaryCommand(a.plugin),
					primaryCommand(b.plugin)
				)
		)
		.slice(0, MAX_RESULTS)
		.map((entry) => entry.plugin);
}

function formatCommandLine(plugin = {}, prefix = ".") {
	const command = primaryCommand(plugin);
	const description = String(plugin.description || "Aetheria command").trim();

	return `• \`${prefix}${command}\` - ${description}`;
}

function formatCategoryLine([category, commands]) {
	const meta = getCommandCategoryMeta(category);

	return `${meta.icon} *${meta.label}* (${commands.length})`;
}

function formatCommandDetail(plugin = {}, prefix = ".") {
	const meta = getCommandCategoryMeta(plugin.category);
	const aliases = commandAliases(plugin);
	const usage = Array.isArray(plugin.usage)
		? plugin.usage
		: String(plugin.usage || "")
				.split("\n")
				.filter(Boolean);
	const rows = [
		`${meta.icon} *${plugin.name || primaryCommand(plugin)}*`,
		`_${plugin.description || "Aetheria command"}_`,
		DIVIDER,
		`Command: \`${prefix}${primaryCommand(plugin)}\``,
		aliases.length > 1 ? `Alias: \`${aliases.slice(1).join(", ")}\`` : "",
		`Kategori: *${meta.label}*`,
	];

	if (usage.length) {
		rows.push(
			"",
			"*Cara pakai*",
			...usage.map(
				(line) =>
					`• \`${String(line)
						.replace(/\$prefix/g, prefix)
						.replace(/\$command/g, primaryCommand(plugin))}\``
			)
		);
	}

	return rows.filter(Boolean).join("\n");
}

function buildRecommendedPlugins(plugins = [], options = {}) {
	const visible = getVisibleCommandPlugins(plugins, options);
	const byAlias = new Map();

	for (const plugin of visible) {
		for (const alias of commandAliases(plugin)) {
			byAlias.set(normalize(alias), plugin);
		}
	}

	const picked = [];
	const seen = new Set();

	for (const command of RECOMMENDED_COMMANDS) {
		const plugin = byAlias.get(command);
		const primary = primaryCommand(plugin);

		if (plugin && primary && !seen.has(primary)) {
			picked.push(plugin);
			seen.add(primary);
		}
	}

	return picked.slice(0, 10);
}

export function buildCommandDiscoveryPayload({
	brand = BRAND_CONFIG,
	isOwner = false,
	plugins = [],
	prefix = ".",
	query = "",
} = {}) {
	const safePrefix = prefix || ".";
	const visible = getVisibleCommandPlugins(plugins, { isOwner });
	const groups = groupCommandPluginsByCategory(plugins, { isOwner });
	const normalizedQuery = normalize(query);

	if (!normalizedQuery) {
		const recommended = buildRecommendedPlugins(plugins, { isOwner });
		const text = [
			`🌌 *${brand.name} Command Finder*`,
			"_Cari fitur tanpa baca menu panjang._",
			DIVIDER,
			"*Rekomendasi cepat*",
			...(recommended.length
				? recommended.map((plugin) =>
						formatCommandLine(plugin, safePrefix)
					)
				: [`• \`${safePrefix}help\` - Lihat semua command`]),
			"",
			"*Kategori*",
			...groups.map(formatCategoryLine),
			"",
			`Cari: \`${safePrefix}fitur cari rpg\``,
			`Detail: \`${safePrefix}fitur daily\``,
			`Kategori: \`${safePrefix}fitur downloader\``,
		].join("\n");

		return {
			sections: [
				{
					rows: recommended.map((plugin) => ({
						description: plugin.description || "Aetheria command",
						id: `${safePrefix}${primaryCommand(plugin)}`,
						title: `${safePrefix}${primaryCommand(plugin)}`,
					})),
					title: "Rekomendasi",
				},
				{
					rows: groups.map(([category, commands]) => {
						const meta = getCommandCategoryMeta(category);

						return {
							description: `${commands.length} command tersedia`,
							id: `${safePrefix}fitur ${category}`,
							title: meta.label,
						};
					}),
					title: "Kategori",
				},
			],
			text,
			title: `${brand.name} Command Finder`,
		};
	}

	const exact = findCommandPlugin(visible, normalizedQuery, { isOwner });

	if (exact) {
		return {
			sections: [
				{
					rows: [
						{
							description:
								exact.description || "Jalankan command",
							id: `${safePrefix}${primaryCommand(exact)}`,
							title: `${safePrefix}${primaryCommand(exact)}`,
						},
					],
					title: "Jalankan",
				},
			],
			text: formatCommandDetail(exact, safePrefix),
			title: `${brand.name} Command Detail`,
		};
	}

	const category = getCategoryKey(normalizedQuery);
	const categoryGroup = groups.find(([key]) => key === category);

	if (categoryGroup) {
		const [key, categoryPlugins] = categoryGroup;
		const meta = getCommandCategoryMeta(key);
		const text = [
			`${meta.icon} *${meta.label}*`,
			`${categoryPlugins.length} command tersedia.`,
			DIVIDER,
			...categoryPlugins
				.slice(0, MAX_RESULTS)
				.map((plugin) => formatCommandLine(plugin, safePrefix)),
			categoryPlugins.length > MAX_RESULTS
				? `\n+${categoryPlugins.length - MAX_RESULTS} command lain. Pakai \`${safePrefix}help ${key}\`.`
				: "",
		]
			.filter(Boolean)
			.join("\n");

		return {
			sections: [
				{
					rows: categoryPlugins
						.slice(0, MAX_RESULTS)
						.map((plugin) => ({
							description:
								plugin.description || "Aetheria command",
							id: `${safePrefix}${primaryCommand(plugin)}`,
							title: `${safePrefix}${primaryCommand(plugin)}`,
						})),
					title: meta.label,
				},
			],
			text,
			title: `${brand.name} ${meta.label}`,
		};
	}

	const cleanedQuery = normalizedQuery.replace(
		new RegExp("^(cari|search|find)\\s+", "i"),
		""
	);
	const results = searchCommandPlugins(visible, cleanedQuery, { isOwner });

	if (!results.length) {
		return {
			sections: [],
			text: [
				"❌ *Fitur tidak ditemukan*",
				`Query: \`${cleanedQuery || normalizedQuery}\``,
				"",
				`Coba kata lain, misalnya \`${safePrefix}fitur rpg\`, \`${safePrefix}fitur download\`, atau \`${safePrefix}help\`.`,
			].join("\n"),
			title: `${brand.name} Search`,
		};
	}

	const highlighted = new RegExp(`(${escapeRegex(cleanedQuery)})`, "ig");
	const text = [
		`🔎 *Hasil pencarian: ${cleanedQuery || normalizedQuery}*`,
		DIVIDER,
		...results.map((plugin) =>
			formatCommandLine(plugin, safePrefix).replace(highlighted, "*$1*")
		),
		"",
		`Detail: \`${safePrefix}fitur <command>\``,
	].join("\n");

	return {
		sections: [
			{
				rows: results.map((plugin) => ({
					description: plugin.description || "Aetheria command",
					id: `${safePrefix}${primaryCommand(plugin)}`,
					title: `${safePrefix}${primaryCommand(plugin)}`,
				})),
				title: "Hasil Pencarian",
			},
		],
		text,
		title: `${brand.name} Search`,
	};
}
