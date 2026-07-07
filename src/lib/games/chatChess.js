import { createGameSessionStore } from "#lib/games/sessionManager";

const store = createGameSessionStore();
const FILES = "abcdefgh";
const INITIAL_BOARD = [
	"rnbqkbnr",
	"pppppppp",
	"........",
	"........",
	"........",
	"........",
	"PPPPPPPP",
	"RNBQKBNR",
];

const PIECE_SYMBOLS = {
	B: "♗",
	K: "♔",
	N: "♘",
	P: "♙",
	Q: "♕",
	R: "♖",
	b: "♝",
	k: "♚",
	n: "♞",
	p: "♟",
	q: "♛",
	r: "♜",
};

function normalizeId(id) {
	return String(id || "").trim();
}

function displayName(name, fallback = "Player") {
	return (
		String(name || fallback)
			.trim()
			.slice(0, 32) || fallback
	);
}

function createBoard() {
	return INITIAL_BOARD.map((row) => row.split(""));
}

function getPieceColor(piece) {
	if (!piece || piece === ".") {
		return null;
	}

	return piece === piece.toUpperCase() ? "white" : "black";
}

function opponent(color) {
	return color === "white" ? "black" : "white";
}

function getPlayerColor(session, playerId) {
	const id = normalizeId(playerId);

	if (session.players.white?.id === id) {
		return "white";
	}

	if (session.players.black?.id === id) {
		return "black";
	}

	return null;
}

function parseSquare(value) {
	const input = String(value || "").toLowerCase();
	const file = input[0];
	const rank = Number(input[1]);
	const col = FILES.indexOf(file);

	if (col < 0 || !Number.isInteger(rank) || rank < 1 || rank > 8) {
		return null;
	}

	return {
		col,
		row: 8 - rank,
		square: `${file}${rank}`,
	};
}

export function parseChessMove(input = "") {
	const normalized = String(input || "")
		.toLowerCase()
		.replace(/[^a-h1-8]/g, "");

	if (normalized.length < 4) {
		return null;
	}

	const from = parseSquare(normalized.slice(0, 2));
	const to = parseSquare(normalized.slice(2, 4));

	if (!from || !to) {
		return null;
	}

	return { from, to, notation: `${from.square}${to.square}` };
}

function isInside(row, col) {
	return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function isPathClear(board, from, to) {
	const rowStep = Math.sign(to.row - from.row);
	const colStep = Math.sign(to.col - from.col);
	let row = from.row + rowStep;
	let col = from.col + colStep;

	while (row !== to.row || col !== to.col) {
		if (board[row][col] !== ".") {
			return false;
		}
		row += rowStep;
		col += colStep;
	}

	return true;
}

function isLegalPieceMove(board, piece, from, to) {
	const color = getPieceColor(piece);
	const target = board[to.row][to.col];
	const targetColor = getPieceColor(target);
	const rowDelta = to.row - from.row;
	const colDelta = to.col - from.col;
	const absRow = Math.abs(rowDelta);
	const absCol = Math.abs(colDelta);
	const lower = piece.toLowerCase();

	if (!isInside(to.row, to.col) || targetColor === color) {
		return false;
	}

	if (lower === "p") {
		const direction = color === "white" ? -1 : 1;
		const startRow = color === "white" ? 6 : 1;
		const oneStep =
			rowDelta === direction && colDelta === 0 && target === ".";
		const twoStep =
			from.row === startRow &&
			rowDelta === direction * 2 &&
			colDelta === 0 &&
			target === "." &&
			board[from.row + direction][from.col] === ".";
		const capture =
			rowDelta === direction &&
			absCol === 1 &&
			targetColor === opponent(color);

		return oneStep || twoStep || capture;
	}

	if (lower === "n") {
		return (absRow === 2 && absCol === 1) || (absRow === 1 && absCol === 2);
	}

	if (lower === "b") {
		return absRow === absCol && isPathClear(board, from, to);
	}

	if (lower === "r") {
		return (
			(rowDelta === 0 || colDelta === 0) && isPathClear(board, from, to)
		);
	}

	if (lower === "q") {
		const straight = rowDelta === 0 || colDelta === 0;
		const diagonal = absRow === absCol;
		return (straight || diagonal) && isPathClear(board, from, to);
	}

	if (lower === "k") {
		return absRow <= 1 && absCol <= 1 && absRow + absCol > 0;
	}

	return false;
}

function findKing(board, color) {
	const king = color === "white" ? "K" : "k";

	for (let row = 0; row < 8; row += 1) {
		for (let col = 0; col < 8; col += 1) {
			if (board[row][col] === king) {
				return { row, col };
			}
		}
	}

	return null;
}

function createSession(whiteId, whiteName, blackId = null, blackName = null) {
	const hasBlack = Boolean(blackId);

	return {
		type: "chat-chess",
		status: hasBlack ? "active" : "waiting",
		players: {
			white: {
				id: normalizeId(whiteId),
				name: displayName(whiteName, "White"),
			},
			black: hasBlack
				? {
						id: normalizeId(blackId),
						name: displayName(blackName, "Black"),
					}
				: null,
		},
		board: createBoard(),
		turn: "white",
		moveNumber: 1,
		history: [],
		createdAt: Date.now(),
	};
}

export function resetChessGames() {
	store.clear();
}

export function getChessGame(chatId) {
	return store.get(chatId);
}

export function startChessGame(
	chatId,
	whiteId,
	whiteName,
	blackId = null,
	blackName = null,
	now = Date.now()
) {
	const existing = store.get(chatId, now);

	if (existing && existing.status !== "ended") {
		return { status: "exists", session: existing };
	}

	const session = createSession(whiteId, whiteName, blackId, blackName);

	return { status: "created", session: store.set(chatId, session, now) };
}

export function joinChessGame(chatId, playerId, playerName, now = Date.now()) {
	const session = store.get(chatId, now);

	if (!session) {
		return { status: "missing" };
	}

	if (session.status !== "waiting") {
		return { status: "already_started", session };
	}

	if (session.players.white.id === normalizeId(playerId)) {
		return { status: "already_joined", session };
	}

	session.players.black = {
		id: normalizeId(playerId),
		name: displayName(playerName, "Black"),
	};
	session.status = "active";

	return { status: "joined", session: store.set(chatId, session, now) };
}

export function moveChessPiece(chatId, playerId, input, now = Date.now()) {
	const session = store.get(chatId, now);

	if (!session) {
		return { status: "missing" };
	}

	if (session.status !== "active") {
		return { status: "not_active", session };
	}

	const color = getPlayerColor(session, playerId);

	if (!color) {
		return { status: "not_player", session };
	}

	if (color !== session.turn) {
		return { status: "not_turn", session };
	}

	const move = parseChessMove(input);

	if (!move) {
		return { status: "bad_notation", session };
	}

	const piece = session.board[move.from.row][move.from.col];

	if (piece === "." || getPieceColor(piece) !== color) {
		return { status: "no_piece", session, move };
	}

	if (!isLegalPieceMove(session.board, piece, move.from, move.to)) {
		return { status: "illegal", session, move, piece };
	}

	const captured = session.board[move.to.row][move.to.col];
	session.board[move.to.row][move.to.col] = piece;
	session.board[move.from.row][move.from.col] = ".";

	let promoted = false;
	if (piece === "P" && move.to.row === 0) {
		session.board[move.to.row][move.to.col] = "Q";
		promoted = true;
	}
	if (piece === "p" && move.to.row === 7) {
		session.board[move.to.row][move.to.col] = "q";
		promoted = true;
	}

	const notation = `${move.notation}${captured !== "." ? `x${captured}` : ""}${
		promoted ? "=Q" : ""
	}`;
	session.history.push({
		color,
		move: notation,
		piece,
		captured: captured === "." ? null : captured,
	});

	if (
		captured.toLowerCase() === "k" ||
		!findKing(session.board, opponent(color))
	) {
		session.status = "ended";
		session.winner = color;
		session.endedAt = now;
		return {
			captured,
			color,
			move,
			promoted,
			session: store.set(chatId, session, now),
			status: "won",
		};
	}

	session.turn = opponent(color);
	if (session.turn === "white") {
		session.moveNumber += 1;
	}

	return {
		captured: captured === "." ? null : captured,
		color,
		move,
		promoted,
		session: store.set(chatId, session, now),
		status: "moved",
	};
}

export function resignChessGame(chatId, playerId, now = Date.now()) {
	const session = store.get(chatId, now);

	if (!session) {
		return { status: "missing" };
	}

	const color = getPlayerColor(session, playerId);

	if (!color) {
		return { status: "not_player", session };
	}

	session.status = "ended";
	session.winner = opponent(color);
	session.endedAt = now;

	return {
		status: "resigned",
		color,
		session: store.set(chatId, session, now),
	};
}

export function stopChessGame(chatId, playerId, isOwner = false) {
	const session = store.get(chatId);

	if (!session) {
		return { status: "missing" };
	}

	const color = getPlayerColor(session, playerId);

	if (!isOwner && color !== "white") {
		return { status: "not_host", session };
	}

	store.remove(chatId);

	return { status: "stopped", session };
}

export function formatChessBoard(session) {
	if (!session) {
		return "Belum ada game catur aktif.";
	}

	const rows = ["    a b c d e f g h"];

	for (let row = 0; row < 8; row += 1) {
		const rank = 8 - row;
		const cells = session.board[row]
			.map((piece) => PIECE_SYMBOLS[piece] || "·")
			.join(" ");
		rows.push(`${rank} | ${cells} | ${rank}`);
	}

	rows.push("    a b c d e f g h");

	return rows.join("\n");
}

export function formatChessStatus(session, prefix = ".") {
	if (!session) {
		return [
			"♟️ *Catur Aetheria*",
			`• ${prefix}chess start - buat lobby`,
			`• ${prefix}chess join - ikut sebagai hitam`,
			`• ${prefix}chess move e2e4 - gerakkan bidak`,
			`• ${prefix}chess board - lihat papan`,
			`• ${prefix}chess resign - menyerah`,
		].join("\n");
	}

	const white = session.players.white?.name || "-";
	const black = session.players.black?.name || "menunggu lawan";
	const turnName = session.players[session.turn]?.name || "-";
	const lines = [
		"♟️ *Catur Aetheria*",
		`Status: ${session.status}`,
		`Putih: ${white}`,
		`Hitam: ${black}`,
		`Giliran: ${session.status === "active" ? turnName : "-"}`,
		"",
		formatChessBoard(session),
	];

	if (session.status === "waiting") {
		lines.push("", `Lawan bisa join: ${prefix}chess join`);
	}

	if (session.status === "active") {
		lines.push("", `Gerak: ${prefix}chess move e2e4`);
	}

	if (session.status === "ended" && session.winner) {
		lines.push(
			"",
			`Pemenang: ${session.players[session.winner]?.name || "-"}`
		);
	}

	return lines.join("\n");
}

export function formatChessMoveResult(result, prefix = ".") {
	if (!result?.session) {
		return formatChessStatus(null, prefix);
	}

	const session = result.session;
	const lines = ["♟️ *Catur Aetheria*"];

	if (result.status === "moved" || result.status === "won") {
		const playerName = session.players[result.color]?.name || result.color;
		lines.push(`${playerName}: ${result.move.notation}`);
		if (result.captured) {
			lines.push(
				`Capture: ${PIECE_SYMBOLS[result.captured] || result.captured}`
			);
		}
		if (result.promoted) {
			lines.push("Promosi pion menjadi Queen.");
		}
	}

	if (result.status === "won") {
		lines.push(`Pemenang: ${session.players[session.winner]?.name || "-"}`);
	} else {
		lines.push(`Giliran: ${session.players[session.turn]?.name || "-"}`);
	}

	lines.push("", formatChessBoard(session));

	return lines.join("\n");
}
