import {
	getDiscordCommands,
	getDiscordConfig,
} from "#platforms/discord/client";
import {
	buildDiscordHelpPayload,
	buildDiscordInvitePayload,
	buildDiscordOAuthInviteLink,
	buildDiscordPingPayload,
	buildDiscordServerInvitePayload,
	buildDiscordStatusPayload,
	buildDiscordUpdatePayload,
} from "#platforms/discord/format";
import {
	buildDiscordRpgTextPayload,
	getDiscordPlayerIdentity,
} from "#platforms/discord/rpg";
import {
	buildSpotifyPlaybackSearch,
	getSpotifyInputType,
	normalizeDiscordStreamUrl,
	parseDiscordPlayProviderInput,
	shouldUseYtDlpForDiscordPlay,
} from "#platforms/discord/voice";
import assert from "node:assert/strict";
import test from "node:test";

test("discord commands expose initial slash command set", () => {
	const names = getDiscordCommands().map((command) => command.name);

	assert.deepEqual(names, [
		"ping",
		"status",
		"update",
		"help",
		"invite",
		"invite-aetheria",
		"support",
		"play",
		"stop",
		"nowplaying",
		"rpg",
		"start",
		"profile",
		"daily",
		"quest",
		"guild",
		"adventure",
		"work",
		"heal",
		"leaderboard",
	]);
});

test("discord config stays disabled without token by default", () => {
	const originalToken = process.env.DISCORD_BOT_TOKEN;
	const originalEnabled = process.env.AETHERIA_DISCORD_ENABLED;

	delete process.env.DISCORD_BOT_TOKEN;
	delete process.env.AETHERIA_DISCORD_ENABLED;

	try {
		const config = getDiscordConfig();

		assert.equal(config.enabled, false);
		assert.equal(config.token, "");
	} finally {
		if (originalToken === undefined) {
			delete process.env.DISCORD_BOT_TOKEN;
		} else {
			process.env.DISCORD_BOT_TOKEN = originalToken;
		}

		if (originalEnabled === undefined) {
			delete process.env.AETHERIA_DISCORD_ENABLED;
		} else {
			process.env.AETHERIA_DISCORD_ENABLED = originalEnabled;
		}
	}
});

test("discord payload builders render embeds for public commands", () => {
	const plugins = [
		{
			category: "info",
			command: ["status"],
			description: "Status bot.",
		},
	];

	assert.match(
		buildDiscordPingPayload({ latencyMs: 12 }).embeds[0].description,
		/12ms/
	);
	assert.match(
		buildDiscordStatusPayload({ plugins }).embeds[0].title,
		/Aetheria Status/
	);
	assert.match(
		buildDiscordHelpPayload({ plugins }).embeds[0].fields[0].value,
		/\/daily/
	);
	assert.match(
		buildDiscordHelpPayload({ plugins }).embeds[0].fields[0].value,
		/\/invite-aetheria/
	);
	assert.match(
		buildDiscordHelpPayload({ plugins }).embeds[0].fields[0].value,
		/\/play/
	);
	assert.match(
		buildDiscordHelpPayload({ plugins }).embeds[0].fields[1].value,
		/\.status/
	);
	assert.match(
		buildDiscordInvitePayload({ botNumber: "62881022374677" }).embeds[0]
			.fields[1].value,
		/wa\.me\/62881022374677/
	);
	assert.match(
		buildDiscordUpdatePayload("latest").embeds[0].title,
		/WhatsApp Command Finder/
	);
});

test("discord play command accepts a required query option", () => {
	const play = getDiscordCommands().find(
		(command) => command.name === "play"
	);
	const query = play.options.find((option) => option.name === "query");
	const channel = play.options.find((option) => option.name === "channel");

	assert.equal(query.required, true);
	assert.equal(channel.required, false);
	assert.equal(channel.type, 7);
	assert.deepEqual(channel.channel_types, [2, 13]);
	assert.equal(play.dm_permission, false);
	assert.deepEqual(play.contexts, [0]);
	assert.deepEqual(play.integration_types, [0]);
	assert.equal(
		play.options.some((option) => option.name === "url"),
		false
	);
});

test("discord voice commands are guild-only", () => {
	const voiceCommands = getDiscordCommands().filter((command) =>
		["play", "stop", "nowplaying"].includes(command.name)
	);

	assert.equal(voiceCommands.length, 3);

	for (const command of voiceCommands) {
		assert.equal(command.dm_permission, false);
		assert.deepEqual(command.contexts, [0]);
		assert.deepEqual(command.integration_types, [0]);
	}
});

test("discord invite builder renders oauth url from application id", () => {
	const url = buildDiscordOAuthInviteLink("1492880941440569584");
	const payload = buildDiscordServerInvitePayload({
		applicationId: "1492880941440569584",
	});

	assert.match(url, /discord\.com\/oauth2\/authorize/);
	assert.match(url, /client_id=1492880941440569584/);
	assert.match(url, /applications\.commands/);
	assert.equal(new URL(url).searchParams.get("permissions"), "3524352");
	assert.match(payload.embeds[0].fields[0].value, /1492880941440569584/);
	assert.equal(payload.components[0].components[0].style, 5);
});

test("discord voice helper only accepts http stream urls", () => {
	assert.equal(
		normalizeDiscordStreamUrl(" https://example.com/radio.mp3 "),
		"https://example.com/radio.mp3"
	);
	assert.equal(
		normalizeDiscordStreamUrl("http://example.com/live"),
		"http://example.com/live"
	);
	assert.equal(normalizeDiscordStreamUrl("file:///tmp/audio.mp3"), "");
	assert.equal(normalizeDiscordStreamUrl("ftp://example.com/audio.mp3"), "");
	assert.equal(normalizeDiscordStreamUrl(""), "");
	assert.equal(
		shouldUseYtDlpForDiscordPlay("https://youtube.com/watch?v=abc123"),
		true
	);
	assert.equal(shouldUseYtDlpForDiscordPlay("lofi hip hop"), true);
	assert.equal(shouldUseYtDlpForDiscordPlay("spotify: yoasobi idol"), true);
	assert.equal(
		shouldUseYtDlpForDiscordPlay("https://soundcloud.com/aetheria/song"),
		true
	);
	assert.equal(
		shouldUseYtDlpForDiscordPlay("https://example.com/radio.mp3"),
		false
	);
});

test("discord play provider parser handles spotify and soundcloud", () => {
	assert.deepEqual(parseDiscordPlayProviderInput("spotify: yoasobi idol"), {
		explicit: true,
		provider: "spotify",
		query: "yoasobi idol",
	});
	assert.deepEqual(
		parseDiscordPlayProviderInput("spotify:track:1234567890"),
		{
			explicit: true,
			provider: "spotify",
			query: "spotify:track:1234567890",
		}
	);
	assert.deepEqual(parseDiscordPlayProviderInput("sc: chill mix"), {
		explicit: true,
		provider: "soundcloud",
		query: "chill mix",
	});
	assert.deepEqual(parseDiscordPlayProviderInput("lofi hip hop"), {
		explicit: false,
		provider: "youtube",
		query: "lofi hip hop",
	});
	assert.equal(
		getSpotifyInputType("https://open.spotify.com/track/abc123?si=1"),
		"track"
	);
	assert.equal(
		buildSpotifyPlaybackSearch({
			artists: [{ name: "YOASOBI" }],
			name: "Idol",
		}),
		"YOASOBI - Idol - audio"
	);
});

test("discord rpg helpers derive stable platform identity and markdown", () => {
	const identity = getDiscordPlayerIdentity({
		member: { displayName: "Igyun" },
		user: { id: "1492880941440569584", username: "igyun" },
	});
	const payload = buildDiscordRpgTextPayload({
		description: "*Daily* pakai `/daily` dan `/.mulai`.",
		title: "RPG",
	});

	assert.equal(identity.userId, "1492880941440569584@discord");
	assert.equal(identity.name, "Igyun");
	assert.match(payload.embeds[0].description, /\*\*Daily\*\*/);
});
