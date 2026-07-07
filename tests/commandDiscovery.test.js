import {
	buildCommandDiscoveryPayload,
	searchCommandPlugins,
} from "#lib/commandDiscovery";
import assert from "node:assert/strict";
import test from "node:test";

const plugins = [
	{
		category: "rpg",
		command: ["daily", "harian"],
		description: "Ambil daily reward.",
		name: "daily",
		usage: "$prefix$command",
	},
	{
		category: "downloader",
		command: ["yt", "youtube", "play"],
		description: "Download YouTube audio/video.",
		name: "play",
		usage: "$prefix$command <query>",
	},
	{
		category: "owner",
		command: ["eval"],
		description: "Run JavaScript.",
		name: "eval",
		owner: true,
	},
	{
		category: "info",
		command: ["secret"],
		description: "Hidden command.",
		hidden: true,
		name: "secret",
	},
];

test("command discovery renders overview with visible recommendations", () => {
	const payload = buildCommandDiscoveryPayload({
		plugins,
		prefix: ".",
	});

	assert.match(payload.text, /Command Finder/);
	assert.match(payload.text, /\.daily/);
	assert.doesNotMatch(payload.text, /\.eval/);
	assert.doesNotMatch(payload.text, /\.secret/);
	assert.ok(payload.sections.length >= 1);
});

test("command discovery can search descriptions and aliases", () => {
	const results = searchCommandPlugins(plugins, "youtube", {
		isOwner: false,
	});

	assert.equal(results.length, 1);
	assert.equal(results[0].command[0], "yt");

	const payload = buildCommandDiscoveryPayload({
		plugins,
		prefix: ".",
		query: "cari youtube",
	});

	assert.match(payload.text, /\.yt/);
});

test("command discovery supports category and exact command detail", () => {
	const category = buildCommandDiscoveryPayload({
		plugins,
		prefix: ".",
		query: "download",
	});
	const detail = buildCommandDiscoveryPayload({
		plugins,
		prefix: ".",
		query: "daily",
	});

	assert.match(category.text, /Downloader/);
	assert.match(category.text, /\.yt/);
	assert.match(detail.text, /Ambil daily reward/);
	assert.match(detail.text, /\.daily/);
});

test("command discovery only shows owner commands for owner", () => {
	const publicPayload = buildCommandDiscoveryPayload({
		isOwner: false,
		plugins,
		prefix: ".",
		query: "eval",
	});
	const ownerPayload = buildCommandDiscoveryPayload({
		isOwner: true,
		plugins,
		prefix: ".",
		query: "eval",
	});

	assert.doesNotMatch(publicPayload.text, /\.eval/);
	assert.match(ownerPayload.text, /\.eval/);
});
