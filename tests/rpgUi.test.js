import {
	buildRpgActionButtons,
	buildRpgHomeSections,
	formatRpgHome,
} from "#lib/rpgUi";
import assert from "node:assert/strict";
import test from "node:test";

test("buildRpgActionButtons creates prefixed command ids", () => {
	const buttons = buildRpgActionButtons("!", "shop");

	assert.deepEqual(buttons.slice(0, 2), [
		{ text: "Beli Potion", id: "!beli potion 2" },
		{ text: "Beli Ether", id: "!beli ether" },
	]);
});

test("buildRpgHomeSections uses the active prefix", () => {
	const sections = buildRpgHomeSections("#");
	const ids = sections.flatMap((section) =>
		section.rows.map((row) => row.id)
	);

	assert.ok(ids.includes("#profil"));
	assert.ok(ids.includes("#kembali"));
	assert.ok(ids.includes("#boss"));
	assert.ok(ids.includes("#tavern"));
	assert.ok(ids.includes("#craft list"));
	assert.ok(ids.includes("#land"));
	assert.ok(ids.includes("#chess"));
	assert.ok(ids.includes("#ular"));
});

test("formatRpgHome supports missing and existing character states", () => {
	assert.match(formatRpgHome(null, "!"), /!mulai/);
	assert.match(formatRpgHome(null, "!"), /!kembali/);
	assert.match(
		formatRpgHome(
			{
				name: "Igyun",
				level: 7,
				class: "Mage",
				hp: 80,
				maxHp: 120,
				energy: 30,
				maxEnergy: 50,
				gold: 900,
			},
			"!"
		),
		/Igyun/
	);
});
