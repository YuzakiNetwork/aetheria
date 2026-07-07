import {
	formatDonationMessage,
	formatSponsorMessage,
	formatSupporterWall,
	getSupportPageData,
} from "#lib/supabase/monetization";
import { renderSupportPage } from "#lib/web/homeHandlers";
import assert from "node:assert/strict";
import test from "node:test";

test("formatDonationMessage explains operational support path", () => {
	const text = formatDonationMessage(".");

	assert.match(text, /Dukung Operasional Aetheria/);
	assert.match(text, /Target Bulanan/);
	assert.match(text, /Supporter/);
	assert.match(text, /\.grantpremium supporter 30 <nomor>/);
	assert.match(text, /\.donasi wall/);
	assert.match(text, /\/support/);
});

test("formatSponsorMessage keeps sponsor rules explicit", () => {
	const text = formatSponsorMessage(".");

	assert.match(text, /Sponsor Board Aetheria/);
	assert.match(text, /Update Footer/);
	assert.match(text, /Status Card/);
	assert.match(text, /Community Quest/);
	assert.match(text, /tidak boleh phishing, judi, atau scam/);
});

test("formatSupporterWall handles inactive and missing storage states", () => {
	assert.match(
		formatSupporterWall({ status: "not_configured" }, "."),
		/Supabase aktif/
	);
	assert.match(
		formatSupporterWall({ status: "ok", supporters: [] }, "."),
		/Belum ada supporter aktif/
	);
});

test("support page data and renderer expose support sections", () => {
	const data = getSupportPageData();
	const html = renderSupportPage();

	assert.ok(data.packages.length >= 3);
	assert.ok(data.sponsorSlots.length >= 3);
	assert.match(html, /Support/);
	assert.match(html, /Target Bulanan/);
	assert.match(html, /Sponsor Board/);
	assert.match(html, /Supporter/);
});
