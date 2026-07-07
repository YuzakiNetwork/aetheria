import {
	buildYtDlpStreamTarget,
	getYtDlpAssetName,
	getYtDlpDownloadUrl,
	getYtDlpDownloadUrls,
	isSoundCloudUrl,
	isYoutubeUrl,
} from "#lib/yt-dlp";
import {
	buildSearchAlbumItems,
	parseLimitFlag,
} from "#plugins/downloader/pinterest";
import { normalizeYoutubeUrl } from "#plugins/downloader/play";
import assert from "node:assert/strict";
import test from "node:test";

test("Pinterest search results can be converted into album items", () => {
	const items = buildSearchAlbumItems([
		{
			author: "inji",
			image: "https://example.com/a.jpg",
			source: "https://pinterest.com/pin/1",
			title: "Aetheria",
			type: "image",
		},
		{
			author: "inji",
			source: "https://pinterest.com/pin/2",
			title: "Aetheria Video",
			type: "video",
			video: "https://example.com/a.mp4",
		},
	]);

	assert.equal(items.length, 2);
	assert.equal(items[0].image.url, "https://example.com/a.jpg");
	assert.equal(items[1].video.url, "https://example.com/a.mp4");
	assert.match(items[0].caption, /Aetheria/);
});

test("Pinterest limit flag caps albums to ten items", () => {
	assert.deepEqual(parseLimitFlag("chitoge kirisaki -99", 1, 1, 10), {
		limit: 10,
		query: "chitoge kirisaki",
	});
});

test("normalizeYoutubeUrl adds protocol when missing", () => {
	assert.equal(
		normalizeYoutubeUrl("youtu.be/abc123"),
		"https://youtu.be/abc123"
	);
	assert.equal(
		normalizeYoutubeUrl("https://youtube.com/watch?v=abc123"),
		"https://youtube.com/watch?v=abc123"
	);
});

test("yt-dlp fallback selects standalone Linux binary", () => {
	assert.equal(
		getYtDlpAssetName({ arch: "x64", platform: "linux" }),
		"yt-dlp_linux"
	);
	assert.equal(
		getYtDlpAssetName({ arch: "arm64", platform: "linux" }),
		"yt-dlp_linux_aarch64"
	);
	assert.equal(
		getYtDlpDownloadUrl({ arch: "x64", platform: "linux" }),
		"https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux"
	);
	assert.deepEqual(getYtDlpDownloadUrls({ arch: "x64", platform: "linux" }), [
		"https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux",
		"https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp",
	]);
});

test("yt-dlp stream target supports search queries and music URLs", () => {
	assert.equal(
		buildYtDlpStreamTarget("lofi hip hop radio"),
		"ytsearch1:lofi hip hop radio"
	);
	assert.equal(
		buildYtDlpStreamTarget("lofi hip hop radio", {
			searchProvider: "soundcloud",
		}),
		"scsearch1:lofi hip hop radio"
	);
	assert.equal(
		buildYtDlpStreamTarget("youtu.be/abc123"),
		"https://youtu.be/abc123"
	);
	assert.equal(
		buildYtDlpStreamTarget("soundcloud.com/aetheria/song"),
		"https://soundcloud.com/aetheria/song"
	);
	assert.equal(
		buildYtDlpStreamTarget("https://youtube.com/watch?v=abc123"),
		"https://youtube.com/watch?v=abc123"
	);
	assert.equal(
		isYoutubeUrl("https://music.youtube.com/watch?v=abc123"),
		true
	);
	assert.equal(isSoundCloudUrl("https://soundcloud.com/aetheria/song"), true);
	assert.equal(isYoutubeUrl("https://example.com/radio.mp3"), false);
});
