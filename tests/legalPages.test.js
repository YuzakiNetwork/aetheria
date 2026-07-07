import {
	renderDiscordLinkedRolesPage,
	renderPrivacyPage,
	renderTermsPage,
} from "#lib/web/homeHandlers";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import test from "node:test";

test("legal pages render Discord developer portal targets", () => {
	assert.match(renderTermsPage(), /Terms/);
	assert.match(renderPrivacyPage(), /Privacy/);
	assert.match(renderDiscordLinkedRolesPage(), /Linked Roles/);
	assert.match(renderDiscordLinkedRolesPage(), /\/start/);
});

test("vercel api function count stays within hobby limit", () => {
	const apiFiles = readdirSync("api").filter((file) => file.endsWith(".js"));

	assert.ok(
		apiFiles.length <= 12,
		`expected at most 12 functions, got ${apiFiles.length}: ${apiFiles.join(", ")}`
	);
});
