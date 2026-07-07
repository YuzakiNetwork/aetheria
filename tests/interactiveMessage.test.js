import {
	buildButtonsMessage,
	buildInteractiveMessage,
	buildListMessage,
	buildPollContent,
} from "#lib/interactiveMessage";
import { WAProto } from "baileys";
import assert from "node:assert/strict";
import test from "node:test";

function encode(message) {
	return WAProto.Message.encode(message).finish();
}

test("buildButtonsMessage returns null when no buttons survive normalize", () => {
	const result = buildButtonsMessage("hi", [], {});
	assert.equal(result, null);
});

test("buildButtonsMessage encodes a ButtonsMessage proto", () => {
	const result = buildButtonsMessage(
		"Ada yang perlu dicek?",
		[
			{ text: "Ya", id: "yes" },
			{ text: "Tidak", id: "no" },
		],
		{ footer: "Aetheria", mentions: ["628123456789@s.whatsapp.net"] }
	);

	assert.ok(result, "proto should be returned");
	const bytes = encode(result);
	assert.ok(bytes.length > 0);
	assert.equal(typeof bytes[0], "number");
});

test("buildButtonsMessage drops buttons missing id or text", () => {
	const result = buildButtonsMessage(
		"test",
		[{ text: "valid", id: "v1" }, { text: "no-id" }, { id: "no-text" }],
		{}
	);
	assert.ok(result);
	const decoded = WAProto.Message.decode(encode(result));
	assert.equal(decoded.buttonsMessage.buttons.length, 1);
	assert.equal(decoded.buttonsMessage.buttons[0].buttonId, "v1");
});

test("buildInteractiveMessage supports quick_reply buttons", () => {
	const result = buildInteractiveMessage("Pilih warna", [
		{ text: "Merah", id: "red" },
		{ text: "Biru", id: "blue" },
	]);
	assert.ok(result);
	const decoded = WAProto.Message.decode(encode(result));
	const im = decoded.interactiveMessage;
	assert.equal(im.body.text, "Pilih warna");
	assert.equal(im.nativeFlowMessage.buttons.length, 2);
	assert.equal(im.nativeFlowMessage.buttons[0].name, "quick_reply");
	assert.deepEqual(
		JSON.parse(im.nativeFlowMessage.buttons[0].buttonParamsJson),
		{ display_text: "Merah", id: "red" }
	);
});

test("buildInteractiveMessage supports cta_copy and cta_url buttons", () => {
	const result = buildInteractiveMessage("Promo", [
		{ text: "Salin kode", copy: "ABC123" },
		{ text: "Buka link", url: "https://example.com", useWebview: true },
	]);
	assert.ok(result);
	const decoded = WAProto.Message.decode(encode(result));
	const buttons = decoded.interactiveMessage.nativeFlowMessage.buttons;
	assert.equal(buttons[0].name, "cta_copy");
	assert.equal(buttons[1].name, "cta_url");
	const urlParams = JSON.parse(buttons[1].buttonParamsJson);
	assert.equal(urlParams.action, "url");
	assert.equal(urlParams.webview_presentation, "FULL");
});

test("buildInteractiveMessage supports list (cta_list) sections", () => {
	const result = buildInteractiveMessage("Pilih zona", [
		{
			text: "Zona",
			sections: [
				{
					title: "Utara",
					rows: [
						{ title: "Hutan", id: "hutan", description: "Lv 1-5" },
					],
				},
			],
		},
	]);
	assert.ok(result);
	const decoded = WAProto.Message.decode(encode(result));
	const btn = decoded.interactiveMessage.nativeFlowMessage.buttons[0];
	assert.equal(btn.name, "cta_list");
	const params = JSON.parse(btn.buttonParamsJson);
	assert.equal(params.sections[0].rows[0].title, "Hutan");
});

test("buildInteractiveMessage honors footer + header + mentions", () => {
	const result = buildInteractiveMessage(
		"Pilih opsi",
		[{ text: "OK", id: "ok" }],
		{
			footer: "Aetheria",
			headerText: "Header",
			mentions: ["628123456789@s.whatsapp.net"],
		}
	);
	assert.ok(result);
	const decoded = WAProto.Message.decode(encode(result));
	const im = decoded.interactiveMessage;
	assert.equal(im.footer.text, "Aetheria");
	assert.equal(im.header.title, "Header");
	assert.deepEqual(
		im.contextInfo?.mentionedJid || im.contextInfo?.mentionedJID,
		["628123456789@s.whatsapp.net"]
	);
});

test("buildInteractiveMessage returns null when no buttons survive", () => {
	const result = buildInteractiveMessage(
		"halo",
		[{ text: "tanpa aksi" }],
		{}
	);
	assert.equal(result, null);
});

test("buildListMessage encodes a ListMessage proto for private chats", () => {
	const result = buildListMessage(
		"Pilih menu",
		[
			{
				title: "Minuman",
				rows: [
					{ id: "kopi", title: "Kopi", description: "Hitam" },
					{ id: "teh", title: "Teh", description: "Manis" },
				],
			},
		],
		{ title: "Menu", buttonText: "Lihat", footer: "Aetheria" }
	);
	assert.ok(result);
	const decoded = WAProto.Message.decode(encode(result));
	const list = decoded.listMessage;
	assert.equal(list.buttonText, "Lihat");
	assert.equal(list.title, "Menu");
	assert.equal(list.sections[0].rows.length, 2);
	assert.equal(list.sections[0].rows[0].rowId, "kopi");
});

test("buildListMessage returns null when no rows survive", () => {
	const result = buildListMessage("halo", [{ title: "kosong", rows: [] }]);
	assert.equal(result, null);
});

test("buildPollContent returns normalized poll payload", () => {
	const poll = buildPollContent("Warna favorit?", ["Merah", "Biru", "Merah"]);
	assert.deepEqual(poll, {
		poll: {
			name: "Warna favorit?",
			values: ["Merah", "Biru"],
			selectableCount: 1,
		},
	});
});

test("buildPollContent caps selectableCount to values length", () => {
	const poll = buildPollContent("pilih", ["a", "b", "c", "d", "e"], {
		selectableCount: 99,
	});
	assert.equal(poll.poll.selectableCount, 5);
});

test("buildPollContent returns null on empty values", () => {
	assert.equal(buildPollContent("halo", []), null);
	assert.equal(buildPollContent("halo", ["   ", ""]), null);
});

test("proto export from interactiveMessage builder is serialized with the same shape used in Baileys relays", () => {
	// Sanity: the returned object accepts WAProto.Message.fromObject round-trips.
	const result = buildInteractiveMessage("test", [{ text: "ok", id: "ok" }]);
	assert.ok(result);
	const round = WAProto.Message.fromObject(
		result.toJSON ? result.toJSON() : result
	);
	const bytes = encode(round);
	assert.ok(bytes.length > 0);
});
