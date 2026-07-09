import {
	defaultVoipAuthDir,
	endActiveCall,
	getActiveCall,
	normalizePhone,
} from "#lib/callAdapter";
import assert from "node:assert/strict";
import test from "node:test";

test("normalizePhone strips @s.whatsapp.net suffix", () => {
	assert.equal(normalizePhone("628123456789@s.whatsapp.net"), "628123456789");
});

test("normalizePhone removes non-digits", () => {
	assert.equal(normalizePhone("+62 812-345-6789"), "628123456789");
});

test("normalizePhone handles empty input", () => {
	assert.equal(normalizePhone(""), "");
	assert.equal(normalizePhone(null), "null" === String(null) ? "" : "");
	assert.equal(normalizePhone(undefined), "");
});

test("defaultVoipAuthDir returns a path string", () => {
	const dir = defaultVoipAuthDir();
	assert.ok(typeof dir === "string");
	assert.ok(dir.length > 0);
	assert.match(dir, /auth_info_voip$/);
});

test("getActiveCall returns null when no call is placed", () => {
	assert.equal(getActiveCall(), null);
});

test("endActiveCall is a no-op when no call is placed", () => {
	endActiveCall();
	assert.equal(getActiveCall(), null);
});
