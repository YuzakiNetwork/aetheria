import { BOT_CONFIG } from "#config/index";
import { SettingsModel } from "#lib/database/index";
import print from "#lib/print";
import {
	buildDiscordErrorPayload,
	buildDiscordHelpPayload,
	buildDiscordInvitePayload,
	buildDiscordPingPayload,
	buildDiscordServerInvitePayload,
	buildDiscordStatusPayload,
	buildDiscordSupportPayload,
	buildDiscordUpdatePayload,
} from "#platforms/discord/format";
import {
	DISCORD_RPG_COMMANDS,
	handleDiscordRpgCommand,
	isDiscordRpgCommand,
} from "#platforms/discord/rpg";
import {
	DISCORD_VOICE_COMMANDS,
	handleDiscordVoiceCommand,
	isDiscordVoiceCommand,
	stopAllDiscordVoiceSessions,
} from "#platforms/discord/voice";

const CHAT_INPUT_COMMAND_TYPE = 1;
const STRING_OPTION_TYPE = 3;
const COMMANDS = [
	{
		description: "Cek latency Discord adapter Aetheria.",
		name: "ping",
		type: CHAT_INPUT_COMMAND_TYPE,
	},
	{
		description: "Lihat status runtime Aetheria.",
		name: "status",
		type: CHAT_INPUT_COMMAND_TYPE,
	},
	{
		description: "Lihat update/changelog Aetheria.",
		name: "update",
		options: [
			{
				description: "latest, nomor update, atau kata kunci.",
				name: "query",
				required: false,
				type: STRING_OPTION_TYPE,
			},
		],
		type: CHAT_INPUT_COMMAND_TYPE,
	},
	{
		description: "Lihat command Discord Aetheria.",
		name: "help",
		type: CHAT_INPUT_COMMAND_TYPE,
	},
	{
		description: "Ambil link bot Aetheria dan website.",
		name: "invite",
		type: CHAT_INPUT_COMMAND_TYPE,
	},
	{
		description: "Ambil link invite Aetheria ke server Discord lain.",
		name: "invite-aetheria",
		type: CHAT_INPUT_COMMAND_TYPE,
	},
	{
		description: "Lihat cara dukung operasional Aetheria.",
		name: "support",
		type: CHAT_INPUT_COMMAND_TYPE,
	},
	...DISCORD_VOICE_COMMANDS,
	...DISCORD_RPG_COMMANDS,
];

function env(name, fallback = "") {
	return String(process.env[name] || fallback).trim();
}

export function getDiscordConfig() {
	const token = env("DISCORD_BOT_TOKEN");
	const applicationId = env(
		"DISCORD_APPLICATION_ID",
		env("DISCORD_CLIENT_ID")
	);
	const guildId = env("DISCORD_GUILD_ID");
	const rawEnabled = env("AETHERIA_DISCORD_ENABLED", "auto").toLowerCase();
	const enabled =
		rawEnabled === "true" || (rawEnabled === "auto" && Boolean(token));

	return {
		applicationId,
		enabled,
		guildId,
		registerCommands: env("DISCORD_REGISTER_COMMANDS", "true") !== "false",
		token,
	};
}

export function getDiscordCommands() {
	return COMMANDS;
}

async function loadDiscordJs() {
	try {
		return await import("discord.js");
	} catch (error) {
		const message =
			error?.code === "ERR_MODULE_NOT_FOUND"
				? "discord.js belum terpasang. Jalankan npm install setelah pull update ini."
				: error.message;
		throw new Error(message);
	}
}

async function registerDiscordCommands(config, discord) {
	if (!config.registerCommands) {
		print.debug("[Discord] Slash command registration disabled.");
		return;
	}

	if (!config.applicationId) {
		print.warn(
			"[Discord] DISCORD_APPLICATION_ID is empty; slash command registration skipped."
		);
		return;
	}

	const { REST, Routes } = discord;
	const rest = new REST({ version: "10" }).setToken(config.token);
	const route = config.guildId
		? Routes.applicationGuildCommands(config.applicationId, config.guildId)
		: Routes.applicationCommands(config.applicationId);

	await rest.put(route, { body: COMMANDS });
	print.info(
		`[Discord] Registered ${COMMANDS.length} slash commands${config.guildId ? ` for guild ${config.guildId}` : " globally"}.`
	);
}

async function safeReply(interaction, payload) {
	const body = {
		...payload,
		allowedMentions: {
			parse: [],
		},
	};

	if (interaction.deferred || interaction.replied) {
		await interaction.editReply(body);
		return;
	}

	await interaction.reply(body);
}

async function safeDefer(interaction) {
	if (interaction.deferred || interaction.replied) {
		return;
	}

	await interaction.deferReply();
}

export async function startDiscordBot({
	getWhatsAppSock = () => null,
	pluginManager = null,
} = {}) {
	const config = getDiscordConfig();

	if (!config.enabled) {
		print.debug("[Discord] Adapter disabled.");
		return null;
	}

	if (!config.token) {
		print.warn("[Discord] DISCORD_BOT_TOKEN is empty; adapter skipped.");
		return null;
	}

	let discord;

	try {
		discord = await loadDiscordJs();
	} catch (error) {
		print.error("[Discord] Adapter skipped:", error);
		return null;
	}

	const { Client, Events, GatewayIntentBits } = discord;
	const client = new Client({
		intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
	});

	client.once(Events.ClientReady, async (readyClient) => {
		print.info(`[Discord] Logged in as ${readyClient.user.tag}`);

		try {
			await registerDiscordCommands(config, discord);
		} catch (error) {
			print.error("[Discord] Failed registering slash commands:", error);
		}
	});

	client.on(Events.InteractionCreate, async (interaction) => {
		if (!interaction.isChatInputCommand()) {
			return;
		}

		try {
			if (isDiscordVoiceCommand(interaction.commandName)) {
				await safeDefer(interaction);
				const payload = await handleDiscordVoiceCommand(interaction);

				if (payload) {
					await safeReply(interaction, payload);
					return;
				}
			}

			if (isDiscordRpgCommand(interaction.commandName)) {
				await safeDefer(interaction);
				const payload = await handleDiscordRpgCommand(interaction);

				if (payload) {
					await safeReply(interaction, payload);
					return;
				}
			}

			const plugins = pluginManager?.getPlugins?.() || [];
			const settings = await SettingsModel.getSettings();
			const queueStatus = pluginManager?.getQueueStatus?.() || {};
			const sock = getWhatsAppSock?.();

			if (interaction.commandName === "ping") {
				await safeReply(
					interaction,
					buildDiscordPingPayload({
						latencyMs: client.ws.ping,
					})
				);
				return;
			}

			if (interaction.commandName === "status") {
				await safeReply(
					interaction,
					buildDiscordStatusPayload({
						clientUser: client.user,
						memory: process.memoryUsage(),
						plugins,
						queueStatus,
						settings,
						uptimeMs: process.uptime() * 1000,
					})
				);
				return;
			}

			if (interaction.commandName === "update") {
				await safeReply(
					interaction,
					buildDiscordUpdatePayload(
						interaction.options.getString("query") || "latest"
					)
				);
				return;
			}

			if (interaction.commandName === "help") {
				await safeReply(
					interaction,
					buildDiscordHelpPayload({
						plugins,
						prefix: BOT_CONFIG.prefixes.includes(".")
							? "."
							: BOT_CONFIG.prefixes[0] || ".",
					})
				);
				return;
			}

			if (interaction.commandName === "invite") {
				await safeReply(
					interaction,
					buildDiscordInvitePayload({
						botNumber:
							process.env.BOT_NUMBER ||
							sock?.user?.id ||
							sock?.user?.jid ||
							"",
						prefix: BOT_CONFIG.prefixes.includes(".")
							? "."
							: BOT_CONFIG.prefixes[0] || ".",
					})
				);
				return;
			}

			if (interaction.commandName === "invite-aetheria") {
				await safeReply(interaction, buildDiscordServerInvitePayload());
				return;
			}

			if (interaction.commandName === "support") {
				await safeReply(interaction, buildDiscordSupportPayload());
				return;
			}

			await safeReply(
				interaction,
				buildDiscordErrorPayload("Command Discord tidak dikenal.")
			);
		} catch (error) {
			print.error("[Discord] Interaction failed:", error);

			try {
				await safeReply(
					interaction,
					buildDiscordErrorPayload(
						error.message || "Gagal menjalankan command Discord."
					)
				);
			} catch (replyError) {
				print.error(
					"[Discord] Failed sending error reply:",
					replyError
				);
			}
		}
	});

	client.on(Events.Error, (error) => {
		print.error("[Discord] Client error:", error);
	});

	client.on(Events.ShardError, (error) => {
		print.error("[Discord] Shard error:", error);
	});

	await client.login(config.token);

	return {
		client,
		async stop() {
			stopAllDiscordVoiceSessions();
			await client.destroy();
			print.debug("[Discord] Adapter stopped.");
		},
	};
}
