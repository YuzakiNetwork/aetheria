import {
	formatChessMoveResult,
	formatChessStatus,
	getChessGame,
	joinChessGame,
	moveChessPiece,
	parseChessMove,
	resignChessGame,
	startChessGame,
	stopChessGame,
} from "#lib/games/chatChess";
import { renderChessBoardImage } from "#lib/games/visualBoards";

function getPlayerId(m) {
	return m.senderPn || m.sender;
}

function nameFromJid(jid) {
	const digits = String(jid || "").replace(/\D/g, "");
	return digits ? `@${digits.slice(-6)}` : "Lawan";
}

async function renderVisual(session) {
	try {
		return await renderChessBoardImage(session);
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
		await m.replyInteractive(text, buttons, { footer: "Catur Aetheria" });
		return;
	}

	if (buttons.length && typeof m.replyButtons === "function") {
		await m.replyButtons(text, buttons, { footer: "Catur Aetheria" });
		return;
	}

	await m.reply(text);
}

function chessButtons(prefix) {
	return [
		{ text: "Board", id: `${prefix}chess board` },
		{ text: "Join", id: `${prefix}chess join` },
		{ text: "Resign", id: `${prefix}chess resign` },
	];
}

export default {
	name: "chess",
	description: "Catur turn-based untuk grup Aetheria.",
	command: ["chess", "catur"],
	permissions: "all",
	category: "game",
	cooldown: 2,
	group: true,
	usage: "$prefix$command [start|join|move e2e4|board|resign|stop]",
	wait: null,
	react: true,

	async execute(m, { isOwner }) {
		const action = String(m.args[0] || "board")
			.toLowerCase()
			.trim();
		const playerId = getPlayerId(m);

		if (["start", "mulai", "create"].includes(action)) {
			const target = m.mentions?.[0] || null;

			if (target && target === playerId) {
				await replyGame(m, "Kamu tidak bisa menantang diri sendiri.");
				return;
			}

			const result = startChessGame(
				m.from,
				playerId,
				m.pushName,
				target,
				nameFromJid(target)
			);
			const text =
				result.status === "created"
					? [
							"♟️ *Catur Aetheria dibuat*",
							target
								? "Game langsung aktif. Putih jalan dulu."
								: `Menunggu lawan: ${m.prefix}chess join`,
							"",
							formatChessStatus(result.session, m.prefix),
						].join("\n")
					: [
							"♟️ *Catur sudah aktif*",
							"",
							formatChessStatus(result.session, m.prefix),
						].join("\n");

			await replyGame(m, text, chessButtons(m.prefix), {
				image: await renderVisual(result.session),
			});
			return;
		}

		if (["join", "ikut", "gabung"].includes(action)) {
			const result = joinChessGame(m.from, playerId, m.pushName);
			const messages = {
				already_joined: "Kamu sudah menjadi pemain putih.",
				already_started: "Game sudah berjalan.",
				joined: "Kamu masuk sebagai hitam. Game dimulai.",
				missing: `Belum ada lobby. Buat dulu: ${m.prefix}chess start`,
			};

			await replyGame(
				m,
				[
					`♟️ ${messages[result.status] || result.status}`,
					"",
					formatChessStatus(result.session, m.prefix),
				].join("\n"),
				chessButtons(m.prefix),
				{ image: await renderVisual(result.session) }
			);
			return;
		}

		if (["board", "papan", "status"].includes(action)) {
			await replyGame(
				m,
				formatChessStatus(getChessGame(m.from), m.prefix),
				chessButtons(m.prefix),
				{ image: await renderVisual(getChessGame(m.from)) }
			);
			return;
		}

		if (["resign", "nyerah", "menyerah"].includes(action)) {
			const result = resignChessGame(m.from, playerId);
			const messages = {
				missing: "Tidak ada game catur aktif.",
				not_player: "Kamu bukan pemain di game ini.",
				resigned: "Resign diterima.",
			};

			await replyGame(
				m,
				[
					`♟️ ${messages[result.status] || result.status}`,
					"",
					formatChessStatus(result.session, m.prefix),
				].join("\n"),
				[],
				{ image: await renderVisual(result.session) }
			);
			return;
		}

		if (["stop", "end", "batal"].includes(action)) {
			const result = stopChessGame(m.from, playerId, isOwner);
			const messages = {
				missing: "Tidak ada game catur aktif.",
				not_host: "Hanya pembuat game atau owner yang bisa stop.",
				stopped: "Game catur dihentikan.",
			};

			await replyGame(
				m,
				`♟️ ${messages[result.status] || result.status}`
			);
			return;
		}

		const moveInput =
			action === "move" || action === "gerak"
				? m.args.slice(1).join(" ")
				: parseChessMove(action)
					? action
					: "";

		if (moveInput) {
			const result = moveChessPiece(m.from, playerId, moveInput);
			const messages = {
				bad_notation: `Format gerak: ${m.prefix}chess move e2e4`,
				illegal: "Gerakan itu tidak valid untuk bidak tersebut.",
				missing: `Belum ada game. Buat dulu: ${m.prefix}chess start`,
				no_piece: "Tidak ada bidak milikmu di kotak asal.",
				not_active: "Game belum aktif.",
				not_player: "Kamu bukan pemain di game ini.",
				not_turn: "Belum giliranmu.",
			};

			await replyGame(
				m,
				result.status === "moved" || result.status === "won"
					? formatChessMoveResult(result, m.prefix)
					: [
							`♟️ ${messages[result.status] || result.status}`,
							"",
							formatChessStatus(result.session, m.prefix),
						].join("\n"),
				chessButtons(m.prefix),
				{ image: await renderVisual(result.session) }
			);
			return;
		}

		await replyGame(
			m,
			formatChessStatus(getChessGame(m.from), m.prefix),
			chessButtons(m.prefix),
			{ image: await renderVisual(getChessGame(m.from)) }
		);
	},
};
