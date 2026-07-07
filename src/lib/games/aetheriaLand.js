import { createGameSessionStore } from "#lib/games/sessionManager";

const store = createGameSessionStore();
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;
const START_GOLD = 800;
const PASS_START_REWARD = 180;
const MAX_ROUNDS = 18;

export const LAND_BOARD = [
	{ id: 0, name: "Gerbang Aetheria", type: "start" },
	{ id: 1, name: "Pasar Aruna", type: "property", cost: 120, rent: 24 },
	{ id: 2, name: "Kartu Takdir", type: "event" },
	{ id: 3, name: "Kebun Ether", type: "property", cost: 140, rent: 28 },
	{ id: 4, name: "Pajak Guild", type: "tax", amount: 65 },
	{ id: 5, name: "Dermaga Liora", type: "property", cost: 170, rent: 34 },
	{ id: 6, name: "Kuil Pemulihan", type: "shrine", amount: 80 },
	{ id: 7, name: "Tambang Nox", type: "property", cost: 190, rent: 38 },
	{ id: 8, name: "Portal Tertahan", type: "rest" },
	{ id: 9, name: "Menara Rune", type: "property", cost: 220, rent: 46 },
	{ id: 10, name: "Kartu Takdir", type: "event" },
	{ id: 11, name: "Akademi Sihir", type: "property", cost: 240, rent: 52 },
	{ id: 12, name: "Pajak Kerajaan", type: "tax", amount: 90 },
	{ id: 13, name: "Hutan Astral", type: "property", cost: 260, rent: 58 },
	{ id: 14, name: "Peti Relik", type: "treasure", amount: 120 },
	{ id: 15, name: "Istana Aether", type: "property", cost: 300, rent: 72 },
];

const EVENT_CARDS = [
	{
		name: "Kontrak Tavern",
		text: "mendapat 95 gold dari kontrak cepat.",
		apply(player) {
			player.gold += 95;
		},
	},
	{
		name: "Perbaikan Gear",
		text: "membayar 70 gold untuk memperbaiki gear.",
		apply(player) {
			player.gold -= 70;
		},
	},
	{
		name: "Blessing Rune",
		text: "mendapat 1 giliran ekstra lewat bonus 60 gold.",
		apply(player) {
			player.gold += 60;
		},
	},
	{
		name: "Kabut Portal",
		text: "tertahan dan melewati 1 giliran berikutnya.",
		apply(player) {
			player.skipTurns += 1;
		},
	},
];

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

function pickIndex(length, rng = Math.random) {
	return Math.min(length - 1, Math.floor(rng() * length));
}

function createPlayer(id, name) {
	return {
		id: normalizeId(id),
		name: displayName(name),
		position: 0,
		gold: START_GOLD,
		properties: [],
		skipTurns: 0,
		alive: true,
	};
}

function getAlivePlayers(session) {
	return session.players.filter((player) => player.alive);
}

function getCurrentPlayer(session) {
	const alivePlayers = getAlivePlayers(session);

	if (!alivePlayers.length) {
		return null;
	}

	if (session.turnIndex >= session.players.length) {
		session.turnIndex = 0;
	}

	for (let offset = 0; offset < session.players.length; offset += 1) {
		const index = (session.turnIndex + offset) % session.players.length;
		const player = session.players[index];

		if (player?.alive) {
			session.turnIndex = index;
			return player;
		}
	}

	return null;
}

function advanceTurn(session) {
	const previousIndex = session.turnIndex;

	for (let step = 1; step <= session.players.length; step += 1) {
		const index = (previousIndex + step) % session.players.length;
		const player = session.players[index];

		if (player?.alive) {
			session.turnIndex = index;
			if (index <= previousIndex) {
				session.round += 1;
			}
			return player;
		}
	}

	return null;
}

function findPlayer(session, playerId) {
	const id = normalizeId(playerId);

	return session.players.find((player) => player.id === id) || null;
}

function releaseProperties(session, player) {
	for (const tile of session.board) {
		if (tile.ownerId === player.id) {
			delete tile.ownerId;
		}
	}
	player.properties = [];
}

function markBankruptIfNeeded(session, player, lines) {
	if (player.gold >= 0) {
		return false;
	}

	player.alive = false;
	releaseProperties(session, player);
	lines.push(`${player.name} bangkrut dan keluar dari Aetheria Land.`);

	return true;
}

function resolveWinner(session) {
	const alivePlayers = getAlivePlayers(session);

	if (alivePlayers.length === 1) {
		return alivePlayers[0];
	}

	if (session.round > MAX_ROUNDS) {
		return [...alivePlayers].sort((a, b) => b.gold - a.gold)[0] || null;
	}

	return null;
}

function finishIfNeeded(session, lines) {
	const winner = resolveWinner(session);

	if (!winner) {
		return false;
	}

	session.status = "ended";
	session.winnerId = winner.id;
	session.endedAt = Date.now();
	lines.push(`Pemenang: ${winner.name} dengan ${winner.gold} gold.`);

	return true;
}

function applyTileEffect(session, player, tile, rng) {
	const lines = [`${player.name} mendarat di ${tile.name}.`];

	if (tile.type === "start") {
		player.gold += PASS_START_REWARD;
		lines.push(`Bonus gerbang: +${PASS_START_REWARD} gold.`);
		return { lines };
	}

	if (tile.type === "property") {
		if (!tile.ownerId) {
			session.pendingPurchase = {
				playerId: player.id,
				tileId: tile.id,
			};
			lines.push(
				`Tanah kosong. Harga ${tile.cost} gold, sewa ${tile.rent} gold.`
			);
			lines.push("Gunakan land buy untuk membeli atau land skip.");
			return { pendingPurchase: true, lines };
		}

		if (tile.ownerId === player.id) {
			lines.push("Wilayah ini sudah milikmu.");
			return { lines };
		}

		const owner = findPlayer(session, tile.ownerId);
		const rent = tile.rent;

		player.gold -= rent;
		if (owner?.alive) {
			owner.gold += rent;
		}

		lines.push(
			`Membayar sewa ${rent} gold${owner ? ` ke ${owner.name}` : ""}.`
		);
		markBankruptIfNeeded(session, player, lines);
		return { lines };
	}

	if (tile.type === "tax") {
		player.gold -= tile.amount;
		lines.push(`Membayar pajak ${tile.amount} gold.`);
		markBankruptIfNeeded(session, player, lines);
		return { lines };
	}

	if (tile.type === "shrine" || tile.type === "treasure") {
		player.gold += tile.amount;
		lines.push(`Mendapat ${tile.amount} gold.`);
		return { lines };
	}

	if (tile.type === "rest") {
		player.skipTurns += 1;
		lines.push("Portal menahanmu. Giliran berikutnya dilewati.");
		return { lines };
	}

	if (tile.type === "event") {
		const card = EVENT_CARDS[pickIndex(EVENT_CARDS.length, rng)];
		card.apply(player);
		lines.push(`${card.name}: ${player.name} ${card.text}`);
		markBankruptIfNeeded(session, player, lines);
		return { lines };
	}

	return { lines };
}

export function resetLandGames() {
	store.clear();
}

export function getLandGame(chatId) {
	return store.get(chatId);
}

export function startLandGame(chatId, hostId, hostName, now = Date.now()) {
	const existing = store.get(chatId, now);

	if (existing && existing.status !== "ended") {
		return { status: "exists", session: existing };
	}

	const host = createPlayer(hostId, hostName);
	const session = {
		type: "aetheria-land",
		status: "waiting",
		hostId: host.id,
		players: [host],
		board: LAND_BOARD.map((tile) => ({ ...tile })),
		pendingPurchase: null,
		turnIndex: 0,
		round: 1,
		createdAt: now,
		updatedAt: now,
	};

	return { status: "created", session: store.set(chatId, session, now) };
}

export function joinLandGame(chatId, playerId, playerName, now = Date.now()) {
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

export function beginLandGame(chatId, playerId, now = Date.now()) {
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

export function rollLandGame(
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

	if (session.pendingPurchase) {
		return { status: "pending_purchase", session };
	}

	const current = getCurrentPlayer(session);

	if (!current || current.id !== normalizeId(playerId)) {
		return { status: "not_turn", session, current };
	}

	const lines = [];

	if (current.skipTurns > 0) {
		current.skipTurns -= 1;
		lines.push(`${current.name} melewati giliran karena efek portal.`);
		advanceTurn(session);
		finishIfNeeded(session, lines);

		return {
			status: "skipped",
			lines,
			session: store.set(chatId, session, now),
		};
	}

	const dice = rollDice(rng);
	const oldPosition = current.position;
	const nextPosition = (current.position + dice) % session.board.length;
	const passedStart = oldPosition + dice >= session.board.length;

	current.position = nextPosition;
	lines.push(`${current.name} melempar dadu ${dice}.`);

	if (passedStart) {
		current.gold += PASS_START_REWARD;
		lines.push(`Melewati gerbang: +${PASS_START_REWARD} gold.`);
	}

	const tile = session.board[current.position];
	const tileResult = applyTileEffect(session, current, tile, rng);
	lines.push(...tileResult.lines);

	if (!tileResult.pendingPurchase) {
		finishIfNeeded(session, lines);
		if (session.status !== "ended") {
			advanceTurn(session);
		}
	}

	return {
		dice,
		lines,
		status: tileResult.pendingPurchase ? "pending_purchase" : "rolled",
		tile,
		session: store.set(chatId, session, now),
	};
}

export function buyLandProperty(chatId, playerId, now = Date.now()) {
	const session = store.get(chatId, now);

	if (!session) {
		return { status: "missing" };
	}

	const pending = session.pendingPurchase;

	if (!pending || pending.playerId !== normalizeId(playerId)) {
		return { status: "nothing_to_buy", session };
	}

	const player = findPlayer(session, playerId);
	const tile = session.board[pending.tileId];

	if (!player || !tile || tile.ownerId) {
		session.pendingPurchase = null;
		return {
			status: "invalid_purchase",
			session: store.set(chatId, session, now),
		};
	}

	if (player.gold < tile.cost) {
		return { status: "not_enough_gold", session, tile, player };
	}

	player.gold -= tile.cost;
	player.properties.push(tile.id);
	tile.ownerId = player.id;
	session.pendingPurchase = null;
	advanceTurn(session);

	return {
		status: "bought",
		session: store.set(chatId, session, now),
		tile,
		player,
	};
}

export function skipLandPurchase(chatId, playerId, now = Date.now()) {
	const session = store.get(chatId, now);

	if (!session) {
		return { status: "missing" };
	}

	const pending = session.pendingPurchase;

	if (!pending || pending.playerId !== normalizeId(playerId)) {
		return { status: "nothing_to_skip", session };
	}

	const tile = session.board[pending.tileId];
	session.pendingPurchase = null;
	advanceTurn(session);

	return {
		status: "skipped_purchase",
		session: store.set(chatId, session, now),
		tile,
	};
}

export function stopLandGame(chatId, playerId, isOwner = false) {
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

export function formatLandHelp(prefix = ".") {
	return [
		"🏙️ *Aetheria Land*",
		"Game ekonomi grup ala board game versi ringan Aetheria.",
		"",
		`• ${prefix}land start - buat lobby`,
		`• ${prefix}land join - ikut lobby`,
		`• ${prefix}land begin - mulai game`,
		`• ${prefix}land roll - lempar dadu`,
		`• ${prefix}land buy - beli wilayah`,
		`• ${prefix}land skip - lewati pembelian`,
		`• ${prefix}land board - lihat papan`,
		`• ${prefix}land stop - hentikan lobby/game`,
	].join("\n");
}

export function formatLandBoard(session) {
	if (!session) {
		return "Belum ada game Aetheria Land aktif.";
	}

	const playersByPosition = new Map();
	for (const player of session.players) {
		if (!player.alive) {
			continue;
		}
		const marker = player.name.slice(0, 2).toUpperCase();
		const list = playersByPosition.get(player.position) || [];
		list.push(marker);
		playersByPosition.set(player.position, list);
	}

	const tileLines = session.board.map((tile) => {
		const owner = tile.ownerId ? findPlayer(session, tile.ownerId) : null;
		const markers = playersByPosition.get(tile.id)?.join(",") || "-";
		const ownerText = owner ? ` | ${owner.name}` : "";
		return `${tile.id}. ${tile.name} [${markers}]${ownerText}`;
	});

	return [
		"🏙️ *Papan Aetheria Land*",
		`Status: ${session.status} | Ronde: ${session.round}/${MAX_ROUNDS}`,
		"",
		...tileLines,
	].join("\n");
}

export function formatLandPlayers(session) {
	if (!session) {
		return "";
	}

	return session.players
		.map((player, index) => {
			const turn =
				session.turnIndex === index && session.status === "active"
					? " ←"
					: "";
			const state = player.alive ? `${player.gold}g` : "bangkrut";
			return `${index + 1}. ${player.name} - petak ${player.position} - ${state}${turn}`;
		})
		.join("\n");
}

export function formatLandSummary(session, prefix = ".") {
	if (!session) {
		return formatLandHelp(prefix);
	}

	const current =
		session.status === "active" ? getCurrentPlayer(session) : null;
	const lines = [
		"🏙️ *Aetheria Land*",
		`Status: ${session.status}`,
		`Pemain: ${session.players.length}/${MAX_PLAYERS}`,
		`Ronde: ${session.round}/${MAX_ROUNDS}`,
		"",
		formatLandPlayers(session),
	];

	if (current) {
		lines.push("", `Giliran: ${current.name}`, `Aksi: ${prefix}land roll`);
	}

	if (session.pendingPurchase) {
		const tile = session.board[session.pendingPurchase.tileId];
		lines.push(
			"",
			`Menunggu pembelian ${tile.name}.`,
			`${prefix}land buy atau ${prefix}land skip`
		);
	}

	return lines.filter(Boolean).join("\n");
}

export function formatLandResult(result, prefix = ".") {
	if (!result) {
		return formatLandHelp(prefix);
	}

	const lines = result.lines?.length
		? [...result.lines]
		: [`Status: ${result.status}`];

	if (result.session?.status === "ended") {
		lines.unshift("🏁 *Aetheria Land Selesai*");
	} else {
		lines.unshift("🏙️ *Aetheria Land*");
	}

	lines.push("", formatLandPlayers(result.session));

	const current =
		result.session?.status === "active"
			? getCurrentPlayer(result.session)
			: null;
	if (current && !result.session?.pendingPurchase) {
		lines.push("", `Giliran berikutnya: ${current.name}`);
	}

	if (result.session?.pendingPurchase) {
		lines.push("", `${prefix}land buy atau ${prefix}land skip`);
	}

	return lines.filter(Boolean).join("\n");
}
