import {
	SNAKES_AND_LADDERS,
	beginSnakesGame,
	formatSnakesBoard,
	formatSnakesHelp,
	formatSnakesResult,
	getSnakesGame,
	joinSnakesGame,
	rollSnakesGame,
	startSnakesGame,
	stopSnakesGame,
} from "#lib/games/snakesLadders";
import { renderSnakesBoardImage } from "#lib/games/visualBoards";

function getPlayerId(m) {
	return m.senderPn || m.sender;
}

async function renderVisual(session) {
	try {
		return await renderSnakesBoardImage(session, SNAKES_AND_LADDERS);
	} catch {
		return null;
	}
}

async function replyGame(m, text, buttons = [], options = {}) {
	if (options.image) {
		try {
			await m.reply({ caption: text, image: options.image });
			return;
		} catch {
			// Fall back to interactive/text if image generation or upload fails.
		}
	}

	if (buttons.length && typeof m.replyInteractive === "function") {
		await m.replyInteractive(text, buttons, {
			footer: "Ular Tangga Aetheria",
		});
		return;
	}

	if (buttons.length && typeof m.replyButtons === "function") {
		await m.replyButtons(text, buttons, {
			footer: "Ular Tangga Aetheria",
		});
		return;
	}

	await m.reply(text);
}

function lobbyButtons(prefix) {
	return [
		{ text: "Join", id: `${prefix}ular join` },
		{ text: "Mulai", id: `${prefix}ular begin` },
		{ text: "Board", id: `${prefix}ular board` },
	];
}

function turnButtons(prefix) {
	return [
		{ text: "Roll", id: `${prefix}ular roll` },
		{ text: "Board", id: `${prefix}ular board` },
		{ text: "Stop", id: `${prefix}ular stop` },
	];
}

export default {
	name: "ular",
	description: "Ular Tangga turn-based untuk grup Aetheria.",
	command: ["ular", "ulartangga", "snakes", "snakeladder"],
	permissions: "all",
	category: "game",
	cooldown: 3,
	group: true,
	usage: "$prefix$command [start|join|begin|roll|board|stop]",
	wait: null,
	react: true,

	async execute(m, { isOwner }) {
		const action = String(m.args[0] || "board")
			.toLowerCase()
			.trim();
		const playerId = getPlayerId(m);

		if (["help", "bantuan"].includes(action)) {
			await replyGame(m, formatSnakesHelp(m.prefix));
			return;
		}

		if (["start", "mulai", "create"].includes(action)) {
			const result = startSnakesGame(m.from, playerId, m.pushName);
			const text =
				result.status === "created"
					? [
							"🎲 *Lobby Ular Tangga dibuat*",
							"Minimal 2 pemain, maksimal 8 pemain.",
							"",
							formatSnakesBoard(result.session, m.prefix),
						].join("\n")
					: [
							"🎲 *Ular Tangga sudah aktif*",
							"",
							formatSnakesBoard(result.session, m.prefix),
						].join("\n");

			await replyGame(m, text, lobbyButtons(m.prefix), {
				image: await renderVisual(result.session),
			});
			return;
		}

		if (["join", "ikut", "gabung"].includes(action)) {
			const result = joinSnakesGame(m.from, playerId, m.pushName);
			const messages = {
				already_joined: "Kamu sudah masuk lobby.",
				already_started: "Game sudah berjalan.",
				full: "Lobby sudah penuh.",
				joined: "Kamu masuk lobby Ular Tangga.",
				missing: `Belum ada lobby. Buat dulu: ${m.prefix}ular start`,
			};

			await replyGame(
				m,
				[
					`🎲 ${messages[result.status] || result.status}`,
					"",
					formatSnakesBoard(result.session, m.prefix),
				].join("\n"),
				lobbyButtons(m.prefix),
				{ image: await renderVisual(result.session) }
			);
			return;
		}

		if (["begin", "play", "gas", "jalan"].includes(action)) {
			const result = beginSnakesGame(m.from, playerId);
			const messages = {
				missing: `Belum ada lobby. Buat dulu: ${m.prefix}ular start`,
				not_enough_players: "Minimal perlu 2 pemain.",
				not_host: "Hanya pembuat lobby yang bisa mulai.",
				started: "Game dimulai.",
			};

			await replyGame(
				m,
				[
					`🎲 ${messages[result.status] || result.status}`,
					"",
					formatSnakesBoard(result.session, m.prefix),
				].join("\n"),
				turnButtons(m.prefix),
				{ image: await renderVisual(result.session) }
			);
			return;
		}

		if (["roll", "dadu"].includes(action)) {
			const result = rollSnakesGame(m.from, playerId);
			const messages = {
				missing: `Belum ada game. Buat dulu: ${m.prefix}ular start`,
				not_active: "Game belum dimulai.",
				not_turn: `Belum giliranmu. Giliran: ${result.current?.name || "-"}`,
			};

			await replyGame(
				m,
				result.lines
					? formatSnakesResult(result, m.prefix)
					: `🎲 ${messages[result.status] || result.status}`,
				turnButtons(m.prefix),
				{ image: await renderVisual(result.session) }
			);
			return;
		}

		if (["board", "papan", "status"].includes(action)) {
			const session = getSnakesGame(m.from);
			await replyGame(
				m,
				formatSnakesBoard(session, m.prefix),
				session?.status === "waiting"
					? lobbyButtons(m.prefix)
					: turnButtons(m.prefix),
				{ image: await renderVisual(session) }
			);
			return;
		}

		if (["stop", "end", "batal"].includes(action)) {
			const result = stopSnakesGame(m.from, playerId, isOwner);
			const messages = {
				missing: "Tidak ada Ular Tangga aktif.",
				not_host: "Hanya pembuat lobby atau owner yang bisa stop.",
				stopped: "Ular Tangga dihentikan.",
			};
			await replyGame(
				m,
				`🎲 ${messages[result.status] || result.status}`
			);
			return;
		}

		await replyGame(m, formatSnakesHelp(m.prefix), lobbyButtons(m.prefix));
	},
};
