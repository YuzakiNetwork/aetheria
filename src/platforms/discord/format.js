import { BRAND_CONFIG } from "#config/brand";
import { MONETIZATION_CONFIG } from "#config/monetization";
import {
	buildWaMeLink,
	formatBytes,
	formatDuration,
	getBotMode,
	summarizePluginCategories,
} from "#lib/community";
import { CHANGELOG_ENTRIES, resolveUpdateEntry } from "#lib/updates";

export const DISCORD_COLOR = 0x7c3aed;
export const DISCORD_ERROR_COLOR = 0xef4444;
export const DISCORD_SUCCESS_COLOR = 0x22c55e;

const DEFAULT_WEBSITE_URL =
	process.env.AETHERIA_PUBLIC_URL ||
	process.env.BOT_WEBSITE_URL ||
	"https://aetheria-theta.vercel.app/";
const DISCORD_INVITE_PERMISSIONS = "3524352";

function getDiscordApplicationId() {
	return String(
		process.env.DISCORD_APPLICATION_ID ||
			process.env.DISCORD_CLIENT_ID ||
			""
	).trim();
}

export function buildDiscordOAuthInviteLink(
	applicationId = getDiscordApplicationId()
) {
	const id = String(applicationId || "").trim();

	if (!id) {
		return "";
	}

	const params = new URLSearchParams({
		client_id: id,
		permissions: DISCORD_INVITE_PERMISSIONS,
		scope: "bot applications.commands",
	});

	return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

function truncate(value = "", limit = 3900) {
	const text = String(value || "").trim();

	if (text.length <= limit) {
		return text;
	}

	return `${text.slice(0, limit - 20).trimEnd()}\n...`;
}

function publicPlugins(plugins = []) {
	return plugins.filter((plugin) => !plugin.hidden && !plugin.owner);
}

function pluginCommand(plugin = {}) {
	return Array.isArray(plugin.command) ? plugin.command[0] : "";
}

function commandSummary(plugins = [], limit = 20, prefix = ".") {
	return publicPlugins(plugins)
		.slice()
		.sort((a, b) =>
			String(a.category || "").localeCompare(
				String(b.category || ""),
				"id"
			)
		)
		.slice(0, limit)
		.map((plugin) => {
			const command = pluginCommand(plugin);
			const description = String(plugin.description || "").trim();

			return command
				? `${prefix}${command} - ${description || "Aetheria command"}`
				: "";
		})
		.filter(Boolean)
		.join("\n");
}

function latestEntries(limit = 5) {
	return CHANGELOG_ENTRIES.slice(0, limit)
		.map((entry, index) => `${index + 1}. ${entry.version} (${entry.tag})`)
		.join("\n");
}

export function buildDiscordErrorPayload(message) {
	return {
		embeds: [
			{
				color: DISCORD_ERROR_COLOR,
				description: truncate(message, 1000),
				title: "Aetheria Error",
			},
		],
		ephemeral: true,
	};
}

export function buildDiscordPingPayload({ latencyMs = 0 } = {}) {
	return {
		embeds: [
			{
				color: DISCORD_SUCCESS_COLOR,
				description: `Gateway latency: **${Math.max(0, Math.round(latencyMs))}ms**`,
				title: "Pong",
			},
		],
	};
}

export function buildDiscordHelpPayload({
	brand = BRAND_CONFIG,
	prefix = ".",
	plugins = [],
	websiteUrl = DEFAULT_WEBSITE_URL,
} = {}) {
	return {
		embeds: [
			{
				color: DISCORD_COLOR,
				description:
					"Discord adapter Aetheria sudah aktif. Command awal fokus ke status, update, invite, dan support. RPG penuh akan dipindah bertahap dari core WhatsApp.",
				fields: [
					{
						inline: false,
						name: "Discord Commands",
						value: [
							"`/ping`",
							"`/status`",
							"`/update`",
							"`/invite-aetheria`",
							"`/play`",
							"`/stop`",
							"`/nowplaying`",
							"`/rpg`",
							"`/start`",
							"`/profile`",
							"`/daily`",
							"`/quest`",
							"`/guild`",
							"`/adventure`",
							"`/work`",
							"`/heal`",
							"`/leaderboard`",
						].join(" "),
					},
					{
						inline: false,
						name: "Command WhatsApp yang sudah ada",
						value:
							commandSummary(plugins, 12, prefix) ||
							"Belum ada command publik yang bisa ditampilkan.",
					},
				],
				title: `${brand.name} Discord`,
				url: websiteUrl,
			},
		],
	};
}

export function buildDiscordStatusPayload({
	brand = BRAND_CONFIG,
	clientUser = null,
	memory = process.memoryUsage(),
	plugins = [],
	queueStatus = {},
	settings = {},
	uptimeMs = process.uptime() * 1000,
	websiteUrl = DEFAULT_WEBSITE_URL,
} = {}) {
	const visiblePlugins = publicPlugins(plugins);
	const categories = summarizePluginCategories(plugins);

	return {
		embeds: [
			{
				color: DISCORD_COLOR,
				description: brand.description || "Aetheria bot runtime.",
				fields: [
					{
						inline: true,
						name: "Mode",
						value: getBotMode(settings),
					},
					{
						inline: true,
						name: "Uptime",
						value: formatDuration(uptimeMs),
					},
					{
						inline: true,
						name: "Platform",
						value: "WhatsApp + Discord",
					},
					{
						inline: true,
						name: "Public Commands",
						value: String(visiblePlugins.length),
					},
					{
						inline: true,
						name: "Categories",
						value: String(categories.length),
					},
					{
						inline: true,
						name: "Queue",
						value: String(queueStatus.totalQueues || 0),
					},
					{
						inline: false,
						name: "Memory",
						value: `${formatBytes(memory.rss || 0)} RSS / ${formatBytes(memory.heapUsed || 0)} heap`,
					},
				],
				footer: {
					text: clientUser?.tag
						? `Discord: ${clientUser.tag}`
						: brand.name,
				},
				title: `${brand.name} Status`,
				url: websiteUrl,
			},
		],
	};
}

export function buildDiscordUpdatePayload(query = "latest") {
	const entry = query ? resolveUpdateEntry(query) : null;

	if (!entry) {
		return {
			embeds: [
				{
					color: DISCORD_COLOR,
					description: latestEntries(8),
					fields: [
						{
							inline: false,
							name: "Cara lihat detail",
							value: "`/update query:latest` atau `/update query:2`",
						},
					],
					title: "Aetheria Changelog",
					url: `${DEFAULT_WEBSITE_URL.replace(/\/$/, "")}/changelog`,
				},
			],
		};
	}

	return {
		embeds: [
			{
				color: DISCORD_COLOR,
				description: truncate(entry.items.join("\n"), 3000),
				fields: [
					{
						inline: false,
						name: "Commands",
						value: entry.commands?.length
							? entry.commands
									.map((command) => `\`${command}\``)
									.join(" ")
							: "-",
					},
				],
				footer: {
					text: `${entry.date} • ${entry.tag}`,
				},
				title: entry.version,
				url: `${DEFAULT_WEBSITE_URL.replace(/\/$/, "")}/changelog`,
			},
		],
	};
}

export function buildDiscordInvitePayload({
	applicationId = getDiscordApplicationId(),
	botNumber = process.env.BOT_NUMBER || "",
	prefix = ".",
	websiteUrl = DEFAULT_WEBSITE_URL,
} = {}) {
	const botLink = buildWaMeLink(botNumber, `${prefix}rpg`);
	const discordLink = buildDiscordOAuthInviteLink(applicationId);

	return {
		embeds: [
			{
				color: DISCORD_COLOR,
				description:
					"Ajak teman main Aetheria dari WhatsApp atau invite bot Discord ke server. Guild ID tidak wajib; command global akan muncul setelah registrasi Discord selesai.",
				fields: [
					{
						inline: false,
						name: "Discord Bot",
						value:
							discordLink ||
							"DISCORD_APPLICATION_ID belum diisi.",
					},
					{
						inline: false,
						name: "WhatsApp Bot",
						value: botLink || "-",
					},
					{
						inline: false,
						name: "Website",
						value: websiteUrl,
					},
				],
				title: `Invite ${BRAND_CONFIG.name}`,
				url: websiteUrl,
			},
		],
	};
}

export function buildDiscordServerInvitePayload({
	applicationId = getDiscordApplicationId(),
	websiteUrl = DEFAULT_WEBSITE_URL,
} = {}) {
	const discordLink = buildDiscordOAuthInviteLink(applicationId);
	const fields = [
		{
			inline: false,
			name: "Invite Link",
			value: discordLink || "DISCORD_APPLICATION_ID belum diisi.",
		},
		{
			inline: false,
			name: "Cara Pakai",
			value: [
				"1. Buka link invite.",
				"2. Pilih server Discord tujuan.",
				"3. Pastikan scope `bot` dan `applications.commands` aktif.",
				"4. Setelah masuk server, coba `/ping`, `/rpg`, atau `/start`.",
			].join("\n"),
		},
		{
			inline: false,
			name: "Catatan",
			value: "Guild ID tidak wajib. Aetheria memakai slash command global, jadi command bisa butuh beberapa menit sampai muncul di server baru.",
		},
	];
	const payload = {
		embeds: [
			{
				color: DISCORD_COLOR,
				description:
					"Gunakan link ini untuk mengundang Aetheria ke server Discord lain.",
				fields,
				title: "Invite Aetheria ke Server Discord",
				url: discordLink || websiteUrl,
			},
		],
	};

	if (discordLink) {
		payload.components = [
			{
				components: [
					{
						label: "Invite Aetheria",
						style: 5,
						type: 2,
						url: discordLink,
					},
					{
						label: "Website",
						style: 5,
						type: 2,
						url: websiteUrl,
					},
				],
				type: 1,
			},
		];
	}

	return payload;
}

export function buildDiscordSupportPayload({
	websiteUrl = MONETIZATION_CONFIG.supportPageUrl,
} = {}) {
	return {
		embeds: [
			{
				color: DISCORD_COLOR,
				description:
					"Support Aetheria bersifat opsional dan tidak pay-to-win. Dana dipakai untuk biaya operasional bot, server, dan layanan pendukung.",
				fields: [
					{
						inline: true,
						name: "Supporter",
						value: MONETIZATION_CONFIG.supporterPrice,
					},
					{
						inline: true,
						name: "Aether Pass",
						value: MONETIZATION_CONFIG.aetherPassPrice,
					},
					{
						inline: false,
						name: "Cara bayar",
						value: MONETIZATION_CONFIG.paymentUrl
							? MONETIZATION_CONFIG.paymentUrl
							: MONETIZATION_CONFIG.paymentText,
					},
				],
				title: "Support Operasional Aetheria",
				url: websiteUrl,
			},
		],
	};
}
