import { parsePollText } from "#plugins/info/poll";
import assert from "node:assert/strict";
import test from "node:test";

test("parsePollText parses native poll command format", () => {
	const parsed = parsePollText(
		"Main apa malam ini? | Aetheria Land | Catur | Ular Tangga"
	);

	assert.deepEqual(parsed, {
		title: "Main apa malam ini?",
		values: ["Aetheria Land", "Catur", "Ular Tangga"],
	});
});

test("parsePollText rejects incomplete polls and removes duplicate options", () => {
	assert.equal(parsePollText("Judul | satu"), null);
	assert.deepEqual(parsePollText("Pilih | A | A | B"), {
		title: "Pilih",
		values: ["A", "B"],
	});
});
