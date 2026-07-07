import {
	beginLandGame,
	buyLandProperty,
	formatLandBoard,
	formatLandHelp,
	formatLandResult,
	formatLandSummary,
	getLandGame,
	joinLandGame,
	rollLandGame,
	skipLandPurchase,
	startLandGame,
	stopLandGame,
} from "#lib/games/aetheriaLand";
import { renderLandBoardImage } from "#lib/games/visualBoards";

function getPlayerId(m) {
	return m.senderPn || m.sender;
}

async function renderVisual(session) {
	try {
		return await renderLandBoardImage(session);
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
		await m.replyInteractive(text, buttons, { footer: "Aetheria Land" });
		return;
	}

	if (buttons.length && typeof m.replyButtons === "function") {
		await m.replyButtons(text, buttons, { footer: "Aetheria Land" });
		return;
	}

	await m.reply(text);
}

function lobbyButtons(prefix) {
	return [
		{ text: "Join", id: `${prefix}land join` },
		{ text: "Mulai", id: `${prefix}land begin` },
		{ text: "Board", id: `${prefix}land board` },
	];
}

function turnButtons(prefix) {
	return [
		{ text: "Roll", id: `${prefix}land roll` },
		{ text: "Buy", id: `${prefix}land buy` },
		{ text: "Skip", id: `${prefix}land skip` },
		{ text: "Board", id: `${prefix}land board` },
	];
}

export default {
	name: "land",
	description: "Aetheria Land, game ekonomi grup ala board game.",
	command: ["land", "aetherialand", "monopoli", "property"],
	permissions: "all",
	category: "game",
	cooldown: 3,
	group: true,
	usage: "$prefix$command [start|join|begin|roll|buy|skip|board|stop]",
	wait: null,
	react: true,

	async execute(m, { isOwner }) {
		const action = String(m.args[0] || "status")
			.toLowerCase()
			.trim();
		const playerId = getPlayerId(m);

		if (["help", "bantuan"].includes(action)) {
			await replyGame(m, formatLandHelp(m.prefix));
			return;
		}

		if (["start", "mulai", "create"].includes(action)) {
			const result = startLandGame(m.from, playerId, m.pushName);
			const text =
				result.status === "created"
					? [
							"🏙️ *Lobby Aetheria Land dibuat*",
							"Minimal 2 pemain, maksimal 6 pemain.",
							"",
							formatLandSummary(result.session, m.prefix),
						].join("\n")
					: [
							"🏙️ *Aetheria Land sudah aktif*",
							"",
							formatLandSummary(result.session, m.prefix),
						].join("\n");

			await replyGame(m, text, lobbyButtons(m.prefix), {
				image: await renderVisual(result.session),
			});
			return;
		}

		if (["join", "ikut", "gabung"].includes(action)) {
			const result = joinLandGame(m.from, playerId, m.pushName);
			const messages = {
				already_joined: "Kamu sudah masuk lobby.",
				already_started: "Game sudah berjalan.",
				full: "Lobby sudah penuh.",
				joined: "Kamu masuk lobby Aetheria Land.",
				missing: `Belum ada lobby. Buat dulu: ${m.prefix}land start`,
			};
			await replyGame(
				m,
				[
					`🏙️ ${messages[result.status] || result.status}`,
					"",
					formatLandSummary(result.session, m.prefix),
				].join("\n"),
				lobbyButtons(m.prefix),
				{ image: await renderVisual(result.session) }
			);
			return;
		}

		if (["begin", "play", "gas", "jalan"].includes(action)) {
			const result = beginLandGame(m.from, playerId);
			const messages = {
				missing: `Belum ada lobby. Buat dulu: ${m.prefix}land start`,
				not_enough_players: "Minimal perlu 2 pemain.",
				not_host: "Hanya pembuat lobby yang bisa mulai.",
				started: "Game dimulai.",
			};
			await replyGame(
				m,
				[
					`🏙️ ${messages[result.status] || result.status}`,
					"",
					formatLandSummary(result.session, m.prefix),
				].join("\n"),
				turnButtons(m.prefix),
				{ image: await renderVisual(result.session) }
			);
			return;
		}

		if (["roll", "dadu"].includes(action)) {
			const result = rollLandGame(m.from, playerId);
			const messages = {
				missing: `Belum ada game. Buat dulu: ${m.prefix}land start`,
				not_active: "Game belum dimulai.",
				not_turn: `Belum giliranmu. Giliran: ${result.current?.name || "-"}`,
				pending_purchase:
					"Selesaikan pembelian dulu: land buy / land skip.",
			};

			await replyGame(
				m,
				result.lines
					? formatLandResult(result, m.prefix)
					: `🏙️ ${messages[result.status] || result.status}`,
				turnButtons(m.prefix),
				{ image: await renderVisual(result.session) }
			);
			return;
		}

		if (["buy", "beli"].includes(action)) {
			const result = buyLandProperty(m.from, playerId);
			const messages = {
				bought: `${result.player?.name} membeli ${result.tile?.name}.`,
				invalid_purchase: "Pembelian tidak valid.",
				missing: `Belum ada game. Buat dulu: ${m.prefix}land start`,
				not_enough_gold: `Gold kurang untuk membeli ${result.tile?.name}.`,
				nothing_to_buy: "Tidak ada wilayah yang menunggu dibeli.",
			};

			await replyGame(
				m,
				[
					`🏙️ ${messages[result.status] || result.status}`,
					"",
					formatLandSummary(result.session, m.prefix),
				].join("\n"),
				turnButtons(m.prefix),
				{ image: await renderVisual(result.session) }
			);
			return;
		}

		if (["skip", "lewati"].includes(action)) {
			const result = skipLandPurchase(m.from, playerId);
			const messages = {
				missing: `Belum ada game. Buat dulu: ${m.prefix}land start`,
				nothing_to_skip: "Tidak ada pembelian yang bisa dilewati.",
				skipped_purchase: `Pembelian ${result.tile?.name} dilewati.`,
			};

			await replyGame(
				m,
				[
					`🏙️ ${messages[result.status] || result.status}`,
					"",
					formatLandSummary(result.session, m.prefix),
				].join("\n"),
				turnButtons(m.prefix),
				{ image: await renderVisual(result.session) }
			);
			return;
		}

		if (["board", "papan", "status"].includes(action)) {
			const session = getLandGame(m.from);
			await replyGame(
				m,
				session ? formatLandBoard(session) : formatLandHelp(m.prefix),
				session?.status === "waiting"
					? lobbyButtons(m.prefix)
					: turnButtons(m.prefix),
				{ image: await renderVisual(session) }
			);
			return;
		}

		if (["stop", "end", "batal"].includes(action)) {
			const result = stopLandGame(m.from, playerId, isOwner);
			const messages = {
				missing: "Tidak ada Aetheria Land aktif.",
				not_host: "Hanya pembuat lobby atau owner yang bisa stop.",
				stopped: "Aetheria Land dihentikan.",
			};
			await replyGame(
				m,
				`🏙️ ${messages[result.status] || result.status}`
			);
			return;
		}

		await replyGame(m, formatLandHelp(m.prefix), lobbyButtons(m.prefix));
	},
};
