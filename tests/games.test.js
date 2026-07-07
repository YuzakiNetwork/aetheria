import {
	beginLandGame,
	buyLandProperty,
	joinLandGame,
	resetLandGames,
	rollLandGame,
	startLandGame,
} from "#lib/games/aetheriaLand";
import {
	joinChessGame,
	moveChessPiece,
	resetChessGames,
	startChessGame,
} from "#lib/games/chatChess";
import {
	SNAKES_AND_LADDERS,
	beginSnakesGame,
	joinSnakesGame,
	resetSnakesGames,
	rollSnakesGame,
	startSnakesGame,
} from "#lib/games/snakesLadders";
import {
	renderChessBoardImage,
	renderLandBoardImage,
	renderSnakesBoardImage,
} from "#lib/games/visualBoards";
import assert from "node:assert/strict";
import test from "node:test";

test("Aetheria Land supports lobby, roll, and property purchase", () => {
	resetLandGames();

	const chatId = "land@g.us";
	assert.equal(startLandGame(chatId, "u1", "Igyun").status, "created");
	assert.equal(joinLandGame(chatId, "u2", "Haruka").status, "joined");
	assert.equal(beginLandGame(chatId, "u1").status, "started");

	const roll = rollLandGame(chatId, "u1", { rng: () => 0 });

	assert.equal(roll.status, "pending_purchase");
	assert.equal(roll.tile.name, "Pasar Aruna");

	const buy = buyLandProperty(chatId, "u1");

	assert.equal(buy.status, "bought");
	assert.equal(buy.tile.ownerId, "u1");
	assert.equal(buy.session.turnIndex, 1);
});

test("Catur Aetheria supports basic legal moves and turn order", () => {
	resetChessGames();

	const chatId = "chess@g.us";
	assert.equal(startChessGame(chatId, "white", "White").status, "created");
	assert.equal(joinChessGame(chatId, "black", "Black").status, "joined");

	const whiteMove = moveChessPiece(chatId, "white", "e2e4");

	assert.equal(whiteMove.status, "moved");
	assert.equal(whiteMove.session.turn, "black");
	assert.equal(moveChessPiece(chatId, "white", "d2d4").status, "not_turn");

	const blackMove = moveChessPiece(chatId, "black", "e7e5");

	assert.equal(blackMove.status, "moved");
	assert.equal(blackMove.session.turn, "white");
});

test("Ular Tangga applies ladders and advances turn", () => {
	resetSnakesGames();

	const chatId = "ular@g.us";
	assert.equal(startSnakesGame(chatId, "u1", "Igyun").status, "created");
	assert.equal(joinSnakesGame(chatId, "u2", "Haruka").status, "joined");
	assert.equal(beginSnakesGame(chatId, "u1").status, "started");

	const roll = rollSnakesGame(chatId, "u1", { rng: () => 0.34 });

	assert.equal(roll.status, "rolled");
	assert.equal(roll.session.players[0].position, 14);
	assert.equal(roll.session.turnIndex, 1);
});

test("game visual boards render PNG buffers", async () => {
	resetLandGames();
	const land = startLandGame("visual-land@g.us", "u1", "Igyun").session;
	joinLandGame("visual-land@g.us", "u2", "Haruka");
	beginLandGame("visual-land@g.us", "u1");
	const landRoll = rollLandGame("visual-land@g.us", "u1", { rng: () => 0 });

	resetChessGames();
	startChessGame("visual-chess@g.us", "u1", "Igyun");
	joinChessGame("visual-chess@g.us", "u2", "Haruka");
	const chessMove = moveChessPiece("visual-chess@g.us", "u1", "e2e4");

	resetSnakesGames();
	startSnakesGame("visual-ular@g.us", "u1", "Igyun");
	joinSnakesGame("visual-ular@g.us", "u2", "Haruka");
	beginSnakesGame("visual-ular@g.us", "u1");
	const snakesRoll = rollSnakesGame("visual-ular@g.us", "u1", {
		rng: () => 0.34,
	});

	const buffers = await Promise.all([
		renderLandBoardImage(landRoll.session || land),
		renderChessBoardImage(chessMove.session),
		renderSnakesBoardImage(snakesRoll.session, SNAKES_AND_LADDERS),
	]);

	for (const buffer of buffers) {
		assert.ok(Buffer.isBuffer(buffer));
		assert.equal(buffer.slice(1, 4).toString(), "PNG");
		assert.ok(buffer.length > 10_000);
	}
});
