import serialize from "#lib/serialize";
import assert from "node:assert/strict";
import test from "node:test";

function createStore() {
	return {
		getContact() {
			return null;
		},
		getGroupMetadata() {
			return null;
		},
		loadMessage() {
			return null;
		},
		updateContacts() {},
	};
}

function createRawMessage(message, key = {}) {
	return {
		key: {
			fromMe: false,
			id: "AETHERIA_TEST_MESSAGE",
			remoteJid: "628123456789@s.whatsapp.net",
			...key,
		},
		message,
		messageTimestamp: 1,
		pushName: "Tester",
	};
}

function createSocket() {
	const calls = [];

	return {
		calls,
		isClonebot: false,
		parseMention() {
			return [];
		},
		sendMessage(jid, content, options) {
			const call = { method: "send", jid, content, options };
			calls.push(call);
			return Promise.resolve(call);
		},
		relayMessage(jid, message, options) {
			const call = { method: "relay", jid, message, options };
			calls.push(call);
			return Promise.resolve(call);
		},
		user: {
			id: "628000000000@s.whatsapp.net",
		},
	};
}

test("serialize extracts native flow response id as body", async () => {
	const sock = createSocket();
	const raw = createRawMessage({
		interactiveResponseMessage: {
			body: {
				text: "Profil",
			},
			nativeFlowResponseMessage: {
				paramsJson: JSON.stringify({
					id: "!profil",
				}),
			},
		},
	});

	const m = await serialize(sock, raw, createStore());

	assert.equal(m.body, "!profil");
});

test("serialize exposes m.chat alias for compatibility", async () => {
	const sock = createSocket();
	const raw = createRawMessage({
		conversation: "=> sock.sendMessage(m.chat, { text: 'ok' })",
	});

	const m = await serialize(sock, raw, createStore());

	assert.equal(m.chat, "628123456789@s.whatsapp.net");
	assert.equal(m.chat, m.from);
});

test("replyInteractive sends plain-text payload (interactive builders parked)", async () => {
	const sock = createSocket();
	const raw = createRawMessage({
		conversation: "!profil",
	});
	const m = await serialize(sock, raw, createStore());

	await m.replyInteractive(
		"Profil siap.",
		[{ text: "Misi", id: "!misi pemula" }],
		{ footer: "Aetheria RPG" }
	);

	assert.equal(sock.calls.length, 1);
	assert.equal(sock.calls[0].jid, "628123456789@s.whatsapp.net");
	assert.equal(sock.calls[0].method, "send");
	assert.equal(sock.calls[0].content.text, "Profil siap.");
});

test("reply coerces undefined and null into safe text", async () => {
	const sock = createSocket();
	const raw = createRawMessage({
		conversation: ">> undefined",
	});
	const m = await serialize(sock, raw, createStore());

	await m.reply(undefined);
	await m.reply(null);

	assert.equal(sock.calls[0].content.text, "undefined");
	assert.equal(sock.calls[1].content.text, "undefined");
});

test("replyList sends plain-text payload (list builders parked)", async () => {
	const sock = createSocket();
	const raw = createRawMessage({
		conversation: "!misi",
	});
	const m = await serialize(sock, raw, createStore());

	await m.replyList(
		"Pilih misi.",
		[
			{
				title: "Kategori",
				rows: [{ title: "Pemula", id: "!misi pemula" }],
			},
		],
		{ buttonText: "Pilih Misi", title: "Misi Aetheria" }
	);

	assert.equal(sock.calls.length, 1);
	assert.equal(sock.calls[0].method, "send");
	assert.equal(sock.calls[0].content.text, "Pilih misi.");
});

test("replyPoll sends poll payload", async () => {
	const sock = createSocket();
	const raw = createRawMessage({
		conversation: "!voterpg",
	});
	const m = await serialize(sock, raw, createStore());

	await m.replyPoll("Voting fitur", ["Dungeon", "Raid"]);

	assert.deepEqual(sock.calls[0].content.poll.values, ["Dungeon", "Raid"]);
	assert.equal(sock.calls[0].content.poll.selectableCount, 1);
});

test("replyTable sends table payload", async () => {
	const sock = createSocket();
	const raw = createRawMessage({
		conversation: "!bestiary tabel",
	});
	const m = await serialize(sock, raw, createStore());

	await m.replyTable({
		headerText: "## Padang Awan",
		title: "Monster Stats",
		table: [
			["Monster", "HP"],
			["Slime", "42"],
		],
	});

	assert.equal(sock.calls.length, 1);
	assert.equal(sock.calls[0].method, "send");
	const rendered = sock.calls[0].content.text;
	assert.match(rendered, /Padang Awan/);
});

test("replyRichResponse sends code table link payload", async () => {
	const sock = createSocket();
	const raw = createRawMessage({
		conversation: "!richdemo",
	});
	const m = await serialize(sock, raw, createStore());

	await m.replyRichResponse({
		disclaimerText: "Aetheria Rich Response Lab",
		headerText: "## Rich Response Demo",
		contentText: "Demo payload",
		code: "console.log('Aetheria')",
		language: "javascript",
		title: "Rich Stats",
		table: [
			["Feature", "Status"],
			["Rich", "Ready"],
		],
		links: [
			{
				text: "Compare upstream",
				url: "https://github.com/itsliaaa/baileys",
			},
		],
	});

	assert.equal(sock.calls.length, 1);
	assert.equal(sock.calls[0].method, "send");
	const rendered = sock.calls[0].content.text;
	assert.match(rendered, /Rich Response Demo/);
	assert.match(rendered, /Demo payload/);
});

test("replyRichResponse supports richResponse latex payload", async () => {
	const sock = createSocket();
	const raw = createRawMessage({
		conversation: "!richdemo latex",
	});
	const m = await serialize(sock, raw, createStore());

	await m.replyRichResponse({
		richResponse: [
			{ text: "LaTeX demo" },
			{
				text: "Formula",
				latex: [{ latexExpression: "E=mc^2" }],
			},
		],
	});

	assert.equal(sock.calls.length, 1);
	assert.equal(sock.calls[0].method, "send");
	const rendered = sock.calls[0].content.text;
	assert.match(rendered, /LaTeX demo/);
});

test("replyRichResponse wraps top-level inline image for Baileys encoding", async () => {
	const sock = createSocket();
	const raw = createRawMessage({
		conversation: "!richdemo image",
	});
	const m = await serialize(sock, raw, createStore());
	const imageUrl = "https://avatars.githubusercontent.com/u/88979678?v=4";

	await m.replyRichResponse({
		headerText: "## Inline Image",
		contentText: "Image metadata demo",
		inlineImage: {
			imagePreviewUrl: imageUrl,
			imageHighResUrl: imageUrl,
			sourceUrl: "https://github.com/itsliaaa/baileys",
		},
		imageText: "Image metadata",
		tapLinkUrl: "https://github.com/itsliaaa/baileys",
		alignment: 2,
		footerText: "done",
	});

	assert.equal(sock.calls.length, 1);
	assert.equal(sock.calls[0].method, "send");
	const rendered = sock.calls[0].content.text;
	assert.match(rendered, /Inline Image/);
	assert.match(rendered, /Image metadata demo/);
});
