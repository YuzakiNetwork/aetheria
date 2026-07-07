import { GroupModel } from "#lib/database/index";
import {
	GROUP_MEMORY_PAYLOAD_KEY,
	addGroupMemoryEntry,
	deleteGroupMemoryEntry,
	findGroupMemoryEntry,
	formatGroupMemoryAdded,
	formatGroupMemoryEntry,
	formatGroupMemoryHelp,
	formatGroupMemoryList,
	parseMemoryTags,
	pickRandomGroupMemoryEntry,
	searchGroupMemoryEntries,
	stripMemoryTags,
} from "#lib/groupMemory";

function getGroupPayloads(group) {
	return group?.payloads && typeof group.payloads === "object"
		? group.payloads
		: {};
}

function getMemoryPayload(group) {
	return getGroupPayloads(group)[GROUP_MEMORY_PAYLOAD_KEY] || {};
}

async function saveMemoryPayload(groupId, group, payload) {
	await GroupModel.setGroup(groupId, {
		name: group?.name || group?.subject || "",
		payloads: {
			...getGroupPayloads(group),
			[GROUP_MEMORY_PAYLOAD_KEY]: payload,
		},
	});
}

function getEntryType(command = "") {
	return ["memory", "memori", "remember"].includes(
		String(command || "").toLowerCase()
	)
		? "memory"
		: "quote";
}

function getSenderJid(m) {
	return m.senderPn || m.sender || "";
}

function getQuotedJid(m) {
	return (
		m.quoted?.senderPn || m.quoted?.sender || m.quoted?.participant || ""
	);
}

function getQuotedText(m) {
	return String(m.quoted?.text || m.quoted?.body || "").trim();
}

function parseSearchInput(args = []) {
	const raw = args.join(" ").trim();

	return {
		query: stripMemoryTags(raw),
		tags: parseMemoryTags(raw),
	};
}

async function replyWithButtons(m, text, type) {
	const buttons = [
		{
			text: "Random",
			id: `${m.prefix}${type} random`,
		},
		{
			text: "List",
			id: `${m.prefix}${type} list`,
		},
		{
			text: "Search",
			id: `${m.prefix}${type} search `,
		},
	];

	if (typeof m.replyInteractive === "function") {
		await m.replyInteractive(text, buttons, {
			footer: "Aetheria Group Memory",
		});
		return;
	}

	if (typeof m.replyButtons === "function") {
		await m.replyButtons(text, buttons, {
			footer: "Aetheria Group Memory",
		});
		return;
	}

	await m.reply(text);
}

export default {
	name: "group-memory",
	description: "Simpan quote dan memori penting/lucu di grup.",
	command: ["quote", "quotes", "memory", "memori", "remember"],
	permissions: "all",
	category: "group",
	cooldown: 5,
	group: true,
	usage: "$prefix$command [add|random|list|search|delete|id]",
	wait: null,
	react: true,

	async execute(m, { command, isAdmin, isOwner }) {
		const group = await GroupModel.getGroup(m.from);
		const payload = getMemoryPayload(group);
		const type = getEntryType(command);
		const action = String(
			m.args[0] || (type === "quote" ? "random" : "list")
		)
			.toLowerCase()
			.trim();

		if (["help", "bantuan"].includes(action)) {
			await m.reply(formatGroupMemoryHelp(m.prefix, command));
			return;
		}

		if (["add", "save", "simpan"].includes(action)) {
			const rawInput = m.args.slice(1).join(" ").trim();
			const tags = parseMemoryTags(rawInput);
			const text =
				type === "quote"
					? getQuotedText(m)
					: stripMemoryTags(rawInput) || getQuotedText(m);

			if (type === "quote" && !m.quoted) {
				await m.reply(
					`Reply pesan teks/caption lalu ketik: ${m.prefix}quote add #tag`
				);
				return;
			}

			if (!text) {
				await m.reply(
					type === "quote"
						? "Quote hanya bisa menyimpan pesan teks/caption."
						: `Isi memori dulu: ${m.prefix}memory add <teks> #tag`
				);
				return;
			}

			const result = addGroupMemoryEntry(payload, {
				type,
				text,
				authorJid: type === "quote" ? getQuotedJid(m) : getSenderJid(m),
				authorName: type === "quote" ? "" : m.pushName,
				savedByJid: getSenderJid(m),
				savedByName: m.pushName,
				sourceMessageId: type === "quote" ? m.quoted?.id : "",
				tags,
			});

			if (result.status !== "ok") {
				await m.reply("Gagal menyimpan memori: teks kosong.");
				return;
			}

			await saveMemoryPayload(m.from, group, result.payload);
			await replyWithButtons(
				m,
				formatGroupMemoryAdded(result.entry, m.prefix),
				type
			);
			return;
		}

		if (["delete", "del", "hapus", "remove", "rm"].includes(action)) {
			if (!isAdmin && !isOwner) {
				await m.reply("Hapus quote/memory hanya untuk admin grup.");
				return;
			}

			const id = m.args[1];
			const result = deleteGroupMemoryEntry(payload, id);

			if (result.status !== "ok") {
				await m.reply(`Memori #${id || "-"} tidak ditemukan.`);
				return;
			}

			await saveMemoryPayload(m.from, group, result.payload);
			await m.reply(
				`🗑️ ${result.entry.type === "memory" ? "Memory" : "Quote"} #${result.entry.id} dihapus.`
			);
			return;
		}

		if (["list", "daftar"].includes(action)) {
			const filters = parseSearchInput(m.args.slice(1));
			const entries = searchGroupMemoryEntries(payload, {
				type,
				...filters,
				limit: 10,
			});

			await replyWithButtons(
				m,
				formatGroupMemoryList(entries, type, m.prefix),
				type
			);
			return;
		}

		if (["search", "cari", "find"].includes(action)) {
			const filters = parseSearchInput(m.args.slice(1));

			if (!filters.query && !filters.tags.length) {
				await m.reply(`${m.prefix}${command} search <kata atau #tag>`);
				return;
			}

			const entries = searchGroupMemoryEntries(payload, {
				type,
				...filters,
				limit: 10,
			});

			await replyWithButtons(
				m,
				formatGroupMemoryList(entries, type, m.prefix),
				type
			);
			return;
		}

		if (["random", "rand", "acak"].includes(action)) {
			const filters = parseSearchInput(m.args.slice(1));
			const entry = pickRandomGroupMemoryEntry(payload, {
				type,
				...filters,
			});

			await replyWithButtons(
				m,
				formatGroupMemoryEntry(entry, m.prefix),
				type
			);
			return;
		}

		if (/^\d+$/.test(action)) {
			await replyWithButtons(
				m,
				formatGroupMemoryEntry(
					findGroupMemoryEntry(payload, action),
					m.prefix
				),
				type
			);
			return;
		}

		await m.reply(formatGroupMemoryHelp(m.prefix, command));
	},
};
