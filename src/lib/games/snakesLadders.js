import { createGameSessionStore } from "#lib/games/sessionManager";

const store = createGameSessionStore();
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;
const FINISH_TILE = 50;

export const SNAKES_AND_LADDERS = {
	3: 14,
	8: 22,
	15: 26,
	21: 37,
	28: 44,
	36: 17,
	42: 24,
	47: 31,
	49: 11,
};

function normalizeId(id) {
	return String(id || "").trim();
}

function displayName(name, fallback = "Aether") {
	return (
		String(name || fallback)
			.trim()
			.slice(0, 32) || fallback
	);
}

function rollDice(rng = Math.random) {
	return Math.floor(rng() * 6) + 1;
}

function createPlayer(id, name) {
	return {
		id: normalizeId(id),
		name: displayName(name),
		position: 0,
	};
}

function findPlayer(session, playerId) {
	const id = normalizeId(playerId);

	return session.players.find((player) => player.id === id) || null;
}

function getCurrentPlayer(session) {
	if (!session?.players?.length) {
		return null;
	}

	return session.players[session.turnIndex % session.players.length] || null;
}

function advanceTurn(session) {
	session.turnIndex = (session.turnIndex + 1) % session.players.length;
	if (session.turnIndex === 0) {
		session.round += 1;
	}

	return getCurrentPlayer(session);
}

export function resetSnakesGames() {
	store.clear();
}

export function getSnakesGame(chatId) {
	return store.get(chatId);
}

export function startSnakesGame(chatId, hostId, hostName, now = Date.now()) {
	const existing = store.get(chatId, now);

	if (existing && existing.status !== "ended") {
		return { status: "exists", session: existing };
	}

	const host = createPlayer(hostId, hostName);
	const session = {
		type: "snakes-ladders",
		status: "waiting",
		hostId: host.id,
		players: [host],
		turnIndex: 0,
		round: 1,
		createdAt: now,
	};

	return { status: "created", session: store.set(chatId, session, now) };
}

export function joinSnakesGame(chatId, playerId, playerName, now = Date.now()) {
	const session = store.get(chatId, now);

	if (!session) {
		return { status: "missing" };
	}

	if (session.status !== "waiting") {
		return { status: "already_started", session };
	}

	if (findPlayer(session, playerId)) {
		return { status: "already_joined", session };
	}

	if (session.players.length >= MAX_PLAYERS) {
		return { status: "full", session };
	}

	session.players.push(createPlayer(playerId, playerName));

	return { status: "joined", session: store.set(chatId, session, now) };
}

export function beginSnakesGame(chatId, playerId, now = Date.now()) {
	const session = store.get(chatId, now);

	if (!session) {
		return { status: "missing" };
	}

	if (session.hostId !== normalizeId(playerId)) {
		return { status: "not_host", session };
	}

	if (session.players.length < MIN_PLAYERS) {
		return { status: "not_enough_players", session };
	}

	session.status = "active";
	session.turnIndex = 0;
	session.round = 1;

	return { status: "started", session: store.set(chatId, session, now) };
}

export function rollSnakesGame(
	chatId,
	playerId,
	{ rng = Math.random, now = Date.now() } = {}
) {
	const session = store.get(chatId, now);

	if (!session) {
		return { status: "missing" };
	}

	if (session.status !== "active") {
		return { status: "not_active", session };
	}

	const current = getCurrentPlayer(session);

	if (!current || current.id !== normalizeId(playerId)) {
		return { status: "not_turn", session, current };
	}

	const dice = rollDice(rng);
	const lines = [`${current.name} melempar dadu ${dice}.`];
	const nextPosition = current.position + dice;

	if (nextPosition > FINISH_TILE) {
		lines.push(
			`Butuh angka pas ke ${FINISH_TILE}. Posisi tetap di ${current.position}.`
		);
		advanceTurn(session);

		return {
			dice,
			lines,
			session: store.set(chatId, session, now),
			status: "rolled",
		};
	}

	current.position = nextPosition;
	lines.push(`Maju ke petak ${current.position}.`);

	const jump = SNAKES_AND_LADDERS[current.position];
	if (jump) {
		const isLadder = jump > current.position;
		lines.push(
			isLadder
				? `Naik tangga ke petak ${jump}.`
				: `Turun karena ular ke petak ${jump}.`
		);
		current.position = jump;
	}

	if (current.position === FINISH_TILE) {
		session.status = "ended";
		session.winnerId = current.id;
		session.endedAt = now;
		lines.push(`${current.name} mencapai finish dan menang.`);
	} else {
		advanceTurn(session);
	}

	return {
		dice,
		lines,
		session: store.set(chatId, session, now),
		status: session.status === "ended" ? "won" : "rolled",
	};
}

export function stopSnakesGame(chatId, playerId, isOwner = false) {
	const session = store.get(chatId);

	if (!session) {
		return { status: "missing" };
	}

	if (!isOwner && session.hostId !== normalizeId(playerId)) {
		return { status: "not_host", session };
	}

	store.remove(chatId);

	return { status: "stopped", session };
}

export function formatSnakesHelp(prefix = ".") {
	return [
		"🎲 *Ular Tangga Aetheria*",
		"Game dadu ringan untuk grup.",
		"",
		`• ${prefix}ular start - buat lobby`,
		`• ${prefix}ular join - ikut lobby`,
		`• ${prefix}ular begin - mulai game`,
		`• ${prefix}ular roll - lempar dadu`,
		`• ${prefix}ular board - lihat posisi`,
		`• ${prefix}ular stop - hentikan game`,
	].join("\n");
}

export function formatSnakesPlayers(session) {
	if (!session) {
		return "";
	}

	return session.players
		.map((player, index) => {
			const turn =
				session.turnIndex === index && session.status === "active"
					? " ←"
					: "";
			return `${index + 1}. ${player.name} - petak ${player.position}${turn}`;
		})
		.join("\n");
}

export function formatSnakesBoard(session, prefix = ".") {
	if (!session) {
		return formatSnakesHelp(prefix);
	}

	const current =
		session.status === "active" ? getCurrentPlayer(session) : null;
	const jumps = Object.entries(SNAKES_AND_LADDERS)
		.map(([from, to]) => `${from}->${to}`)
		.join(", ");
	const lines = [
		"🎲 *Ular Tangga Aetheria*",
		`Status: ${session.status}`,
		`Ronde: ${session.round}`,
		`Finish: petak ${FINISH_TILE}`,
		"",
		formatSnakesPlayers(session),
		"",
		`Tangga/Ular: ${jumps}`,
	];

	if (current) {
		lines.push("", `Giliran: ${current.name}`, `Aksi: ${prefix}ular roll`);
	}

	if (session.status === "waiting") {
		lines.push("", `${prefix}ular join lalu ${prefix}ular begin`);
	}

	if (session.status === "ended") {
		const winner = session.players.find(
			(player) => player.id === session.winnerId
		);
		lines.push("", `Pemenang: ${winner?.name || "-"}`);
	}

	return lines.filter(Boolean).join("\n");
}

export function formatSnakesResult(result, prefix = ".") {
	if (!result?.session) {
		return formatSnakesHelp(prefix);
	}

	const lines = [
		result.status === "won"
			? "🏁 *Ular Tangga Selesai*"
			: "🎲 *Ular Tangga Aetheria*",
		...(result.lines || []),
		"",
		formatSnakesPlayers(result.session),
	];

	const current =
		result.session.status === "active"
			? getCurrentPlayer(result.session)
			: null;
	if (current) {
		lines.push("", `Giliran berikutnya: ${current.name}`);
	}

	return lines.filter(Boolean).join("\n");
}
