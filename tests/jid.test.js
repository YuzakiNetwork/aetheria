import { normalizeJidTarget } from "#lib/jid";
import assert from "node:assert/strict";
import test from "node:test";

test("normalizeJidTarget accepts group and user shortcuts", () => {
	assert.equal(
		normalizeJidTarget("g:1203631234567890"),
		"1203631234567890@g.us"
	);
	assert.equal(
		normalizeJidTarget("u:6281234567890"),
		"6281234567890@s.whatsapp.net"
	);
	assert.equal(
		normalizeJidTarget("1203631234567890"),
		"1203631234567890@g.us"
	);
	assert.equal(
		normalizeJidTarget("6281234567890"),
		"6281234567890@s.whatsapp.net"
	);
});

test("normalizeJidTarget accepts newsletter and arbitrary @ target", () => {
	assert.equal(
		normalizeJidTarget("1203631234567890@newsletter"),
		"1203631234567890@newsletter"
	);
	assert.equal(normalizeJidTarget("user@custom.host"), "user@custom.host");
});

test("normalizeJidTarget returns null for empty or invalid input", () => {
	assert.equal(normalizeJidTarget(""), null);
	assert.equal(normalizeJidTarget(null), null);
	assert.equal(normalizeJidTarget("abc"), null);
});

test("normalizeJidTarget accepts slashed/dashed group ids", () => {
	assert.equal(
		normalizeJidTarget("120363-1234567890"),
		"120363-1234567890@g.us"
	);
});
