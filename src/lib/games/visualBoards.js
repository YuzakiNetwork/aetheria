import { Jimp, JimpMime, loadFont, rgbaToInt } from "jimp";
import { join } from "node:path";

const FONT_ROOT = join(
	process.cwd(),
	"node_modules/@jimp/plugin-print/fonts/open-sans"
);

const COLORS = {
	accent: rgbaToInt(47, 112, 94, 255),
	black: rgbaToInt(25, 29, 34, 255),
	blue: rgbaToInt(61, 105, 166, 255),
	boardDark: rgbaToInt(108, 137, 98, 255),
	boardLight: rgbaToInt(232, 220, 184, 255),
	card: rgbaToInt(250, 247, 238, 255),
	cream: rgbaToInt(247, 241, 226, 255),
	gold: rgbaToInt(214, 164, 64, 255),
	green: rgbaToInt(76, 145, 83, 255),
	grid: rgbaToInt(60, 64, 68, 255),
	muted: rgbaToInt(101, 111, 121, 255),
	red: rgbaToInt(184, 80, 74, 255),
	shadow: rgbaToInt(0, 0, 0, 32),
	white: rgbaToInt(255, 255, 255, 255),
};

let fontPromise = null;

function getFontPath(size, color) {
	return join(
		FONT_ROOT,
		`open-sans-${size}-${color}`,
		`open-sans-${size}-${color}.fnt`
	);
}

async function getFonts() {
	if (!fontPromise) {
		fontPromise = Promise.all([
			loadFont(getFontPath(10, "black")),
			loadFont(getFontPath(12, "black")),
			loadFont(getFontPath(14, "black")),
			loadFont(getFontPath(16, "black")),
			loadFont(getFontPath(16, "white")),
			loadFont(getFontPath(32, "black")),
			loadFont(getFontPath(32, "white")),
			loadFont(getFontPath(64, "black")),
			loadFont(getFontPath(64, "white")),
		]).then(
			([
				black10,
				black12,
				black14,
				black16,
				white16,
				black32,
				white32,
				black64,
				white64,
			]) => ({
				black10,
				black12,
				black14,
				black16,
				white16,
				black32,
				white32,
				black64,
				white64,
			})
		);
	}

	return fontPromise;
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function fillRect(image, x, y, width, height, color) {
	const left = clamp(Math.floor(x), 0, image.bitmap.width);
	const top = clamp(Math.floor(y), 0, image.bitmap.height);
	const right = clamp(Math.ceil(x + width), 0, image.bitmap.width);
	const bottom = clamp(Math.ceil(y + height), 0, image.bitmap.height);

	if (right <= left || bottom <= top) {
		return;
	}

	image.scan(left, top, right - left, bottom - top, (px, py) => {
		image.setPixelColor(color, px, py);
	});
}

function strokeRect(image, x, y, width, height, color, size = 2) {
	fillRect(image, x, y, width, size, color);
	fillRect(image, x, y + height - size, width, size, color);
	fillRect(image, x, y, size, height, color);
	fillRect(image, x + width - size, y, size, height, color);
}

function fillCircle(image, cx, cy, radius, color) {
	const r = Math.floor(radius);

	for (let y = -r; y <= r; y += 1) {
		for (let x = -r; x <= r; x += 1) {
			if (x * x + y * y <= r * r) {
				const px = cx + x;
				const py = cy + y;
				if (
					px >= 0 &&
					py >= 0 &&
					px < image.bitmap.width &&
					py < image.bitmap.height
				) {
					image.setPixelColor(color, px, py);
				}
			}
		}
	}
}

function drawLine(image, x0, y0, x1, y1, color, size = 4) {
	let dx = Math.abs(x1 - x0);
	let dy = -Math.abs(y1 - y0);
	const sx = x0 < x1 ? 1 : -1;
	const sy = y0 < y1 ? 1 : -1;
	let err = dx + dy;
	let x = x0;
	let y = y0;

	while (true) {
		fillCircle(image, x, y, size, color);
		if (x === x1 && y === y1) {
			break;
		}
		const e2 = 2 * err;
		if (e2 >= dy) {
			err += dy;
			x += sx;
		}
		if (e2 <= dx) {
			err += dx;
			y += sy;
		}
		dx = Math.abs(x1 - x0);
		dy = -Math.abs(y1 - y0);
	}
}

function print(image, font, text, x, y, maxWidth, maxHeight = 80) {
	image.print({
		font,
		maxHeight,
		maxWidth,
		text: String(text || ""),
		x,
		y,
	});
}

function shortText(value, max = 18) {
	const text = String(value || "").trim();

	return text.length > max ? `${text.slice(0, max - 1)}.` : text;
}

function markerName(player) {
	return String(player?.name || "?")
		.replace(/[^a-z0-9]/gi, "")
		.slice(0, 2)
		.toUpperCase()
		.padEnd(2, "?");
}

async function toPngBuffer(image) {
	return image.getBuffer(JimpMime.png);
}

function getLandCoords(size = 5) {
	const coords = [];

	for (let x = 0; x < size; x += 1) {
		coords.push({ x, y: 0 });
	}
	for (let y = 1; y < size; y += 1) {
		coords.push({ x: size - 1, y });
	}
	for (let x = size - 2; x >= 0; x -= 1) {
		coords.push({ x, y: size - 1 });
	}
	for (let y = size - 2; y > 0; y -= 1) {
		coords.push({ x: 0, y });
	}

	return coords;
}

function getLandTileColor(tile) {
	if (tile.type === "property") {
		return rgbaToInt(239, 229, 197, 255);
	}
	if (tile.type === "event") {
		return rgbaToInt(218, 233, 243, 255);
	}
	if (tile.type === "tax") {
		return rgbaToInt(245, 213, 206, 255);
	}
	if (tile.type === "treasure" || tile.type === "shrine") {
		return rgbaToInt(230, 239, 212, 255);
	}
	if (tile.type === "rest") {
		return rgbaToInt(232, 224, 245, 255);
	}

	return rgbaToInt(224, 238, 229, 255);
}

export async function renderLandBoardImage(session) {
	if (!session) {
		return null;
	}

	const fonts = await getFonts();
	const image = new Jimp({ color: COLORS.cream, height: 1020, width: 1040 });
	const boardX = 90;
	const boardY = 120;
	const cell = 166;
	const coords = getLandCoords(5);
	const playersByTile = new Map();

	for (const player of session.players || []) {
		if (!player.alive) {
			continue;
		}
		const list = playersByTile.get(player.position) || [];
		list.push(player);
		playersByTile.set(player.position, list);
	}

	print(image, fonts.black32, "AETHERIA LAND", 90, 38, 420, 44);
	print(
		image,
		fonts.black16,
		`Status ${session.status} | Round ${session.round || 1}`,
		93,
		78,
		460,
		28
	);

	fillRect(image, 908, 38, 44, 16, COLORS.gold);
	fillRect(image, 908, 62, 44, 16, COLORS.green);
	print(image, fonts.black12, "owner", 960, 34, 70, 24);
	print(image, fonts.black12, "player", 960, 58, 70, 24);

	for (const tile of session.board || []) {
		const coord = coords[tile.id];
		if (!coord) {
			continue;
		}

		const x = boardX + coord.x * cell;
		const y = boardY + coord.y * cell;

		fillRect(image, x + 6, y + 8, cell - 8, cell - 8, COLORS.shadow);
		fillRect(image, x, y, cell - 10, cell - 10, getLandTileColor(tile));
		strokeRect(image, x, y, cell - 10, cell - 10, COLORS.grid, 3);
		fillRect(image, x, y, cell - 10, 24, COLORS.accent);
		print(image, fonts.white16, String(tile.id), x + 8, y + 2, 32, 22);
		print(
			image,
			fonts.black14,
			shortText(tile.name, 17),
			x + 10,
			y + 34,
			cell - 30,
			40
		);

		if (tile.type === "property") {
			print(
				image,
				fonts.black12,
				`${tile.cost}g / rent ${tile.rent}g`,
				x + 10,
				y + 80,
				cell - 30,
				24
			);
		} else if (tile.amount) {
			print(
				image,
				fonts.black12,
				`${tile.amount}g`,
				x + 10,
				y + 80,
				70,
				24
			);
		} else {
			print(image, fonts.black12, tile.type, x + 10, y + 80, 90, 24);
		}

		if (tile.ownerId) {
			fillRect(image, x + 10, y + 112, 54, 22, COLORS.gold);
			print(image, fonts.black12, "OWN", x + 17, y + 114, 42, 20);
		}

		const players = playersByTile.get(tile.id) || [];
		players.slice(0, 4).forEach((player, index) => {
			const px = x + 72 + index * 34;
			const py = y + 112;
			fillCircle(image, px + 13, py + 11, 15, COLORS.green);
			print(
				image,
				fonts.white16,
				markerName(player),
				px + 2,
				py + 1,
				32,
				22
			);
		});
	}

	const centerX = boardX + cell;
	const centerY = boardY + cell;
	const centerW = cell * 3 - 10;
	const centerH = cell * 3 - 10;
	fillRect(image, centerX, centerY, centerW, centerH, COLORS.card);
	strokeRect(image, centerX, centerY, centerW, centerH, COLORS.accent, 4);
	print(image, fonts.black32, "Players", centerX + 26, centerY + 24, 210, 42);

	const players = session.players || [];
	players.slice(0, 7).forEach((player, index) => {
		const y = centerY + 86 + index * 42;
		const turn = session.turnIndex === index && session.status === "active";
		fillRect(
			image,
			centerX + 24,
			y,
			centerW - 48,
			32,
			turn ? rgbaToInt(232, 240, 220, 255) : COLORS.white
		);
		strokeRect(image, centerX + 24, y, centerW - 48, 32, COLORS.grid, 1);
		fillCircle(image, centerX + 44, y + 16, 13, COLORS.green);
		print(
			image,
			fonts.white16,
			markerName(player),
			centerX + 34,
			y + 6,
			32,
			22
		);
		print(
			image,
			fonts.black14,
			shortText(player.name, 18),
			centerX + 68,
			y + 6,
			170,
			22
		);
		print(
			image,
			fonts.black14,
			player.alive ? `${player.gold}g` : "bankrupt",
			centerX + 260,
			y + 6,
			120,
			22
		);
	});

	if (session.pendingPurchase) {
		const tile = session.board?.[session.pendingPurchase.tileId];
		fillRect(
			image,
			centerX + 24,
			centerY + centerH - 70,
			centerW - 48,
			42,
			COLORS.gold
		);
		print(
			image,
			fonts.black14,
			`Pending buy: ${shortText(tile?.name, 28)}`,
			centerX + 38,
			centerY + centerH - 60,
			centerW - 76,
			24
		);
	}

	return toPngBuffer(image);
}

const PIECE_LABELS = {
	B: "B",
	K: "K",
	N: "N",
	P: "P",
	Q: "Q",
	R: "R",
	b: "b",
	k: "k",
	n: "n",
	p: "p",
	q: "q",
	r: "r",
};

export async function renderChessBoardImage(session) {
	if (!session) {
		return null;
	}

	const fonts = await getFonts();
	const image = new Jimp({ color: COLORS.cream, height: 980, width: 860 });
	const boardX = 86;
	const boardY = 150;
	const cell = 86;
	const files = "abcdefgh";

	print(image, fonts.black32, "CATUR AETHERIA", 74, 34, 420, 46);
	print(
		image,
		fonts.black16,
		`White: ${shortText(session.players.white?.name, 18)} | Black: ${shortText(
			session.players.black?.name || "waiting",
			18
		)}`,
		76,
		78,
		700,
		30
	);
	print(
		image,
		fonts.black16,
		`Turn: ${
			session.status === "active"
				? shortText(session.players[session.turn]?.name, 24)
				: session.status
		}`,
		76,
		108,
		700,
		30
	);

	fillRect(
		image,
		boardX - 26,
		boardY - 26,
		cell * 8 + 52,
		cell * 8 + 52,
		COLORS.card
	);
	strokeRect(
		image,
		boardX - 26,
		boardY - 26,
		cell * 8 + 52,
		cell * 8 + 52,
		COLORS.grid,
		3
	);

	for (let row = 0; row < 8; row += 1) {
		for (let col = 0; col < 8; col += 1) {
			const x = boardX + col * cell;
			const y = boardY + row * cell;
			const light = (row + col) % 2 === 0;
			const piece = session.board?.[row]?.[col] || ".";

			fillRect(
				image,
				x,
				y,
				cell,
				cell,
				light ? COLORS.boardLight : COLORS.boardDark
			);
			if (piece !== ".") {
				const isWhite = piece === piece.toUpperCase();
				fillCircle(
					image,
					x + cell / 2,
					y + cell / 2,
					30,
					isWhite ? COLORS.white : COLORS.black
				);
				strokeRect(
					image,
					x + 18,
					y + 18,
					50,
					50,
					isWhite ? COLORS.black : COLORS.white,
					2
				);
				print(
					image,
					isWhite ? fonts.black32 : fonts.white32,
					PIECE_LABELS[piece],
					x + 30,
					y + 24,
					42,
					42
				);
			}
		}
	}

	for (let index = 0; index < 8; index += 1) {
		print(
			image,
			fonts.black16,
			files[index],
			boardX + index * cell + 36,
			boardY + cell * 8 + 8,
			20,
			24
		);
		print(
			image,
			fonts.black16,
			String(8 - index),
			boardX - 22,
			boardY + index * cell + 32,
			20,
			24
		);
	}

	const history = (session.history || [])
		.slice(-6)
		.map((item, index) => `${index + 1}. ${item.move}`)
		.join("   ");
	if (history) {
		fillRect(image, 74, 890, 710, 48, COLORS.card);
		strokeRect(image, 74, 890, 710, 48, COLORS.grid, 2);
		print(image, fonts.black14, `Last moves: ${history}`, 94, 904, 670, 24);
	}

	return toPngBuffer(image);
}

function snakesTilePosition(tile, columns = 10, rows = 5) {
	const index = tile - 1;
	const rowFromBottom = Math.floor(index / columns);
	const rawCol = index % columns;
	const col = rowFromBottom % 2 === 0 ? rawCol : columns - 1 - rawCol;
	const row = rows - 1 - rowFromBottom;

	return { col, row };
}

export async function renderSnakesBoardImage(session, jumps = {}) {
	if (!session) {
		return null;
	}

	const fonts = await getFonts();
	const image = new Jimp({ color: COLORS.cream, height: 760, width: 1080 });
	const boardX = 48;
	const boardY = 142;
	const cell = 96;
	const columns = 10;
	const rows = 5;
	const playersByTile = new Map();

	for (const player of session.players || []) {
		const list = playersByTile.get(player.position) || [];
		list.push(player);
		playersByTile.set(player.position, list);
	}

	print(image, fonts.black32, "ULAR TANGGA AETHERIA", 48, 36, 520, 46);
	print(
		image,
		fonts.black16,
		`Status ${session.status} | Round ${session.round || 1} | Finish 50`,
		50,
		82,
		540,
		28
	);

	fillRect(image, 750, 44, 42, 16, COLORS.green);
	print(image, fonts.black12, "ladder", 800, 40, 80, 24);
	fillRect(image, 750, 70, 42, 16, COLORS.red);
	print(image, fonts.black12, "snake", 800, 66, 80, 24);

	for (let tile = 1; tile <= 50; tile += 1) {
		const { col, row } = snakesTilePosition(tile, columns, rows);
		const x = boardX + col * cell;
		const y = boardY + row * cell;
		const light = (row + col) % 2 === 0;
		const jump = jumps[tile];

		fillRect(
			image,
			x,
			y,
			cell,
			cell,
			light ? COLORS.card : rgbaToInt(239, 232, 214, 255)
		);
		strokeRect(image, x, y, cell, cell, COLORS.grid, 2);
		print(image, fonts.black14, String(tile), x + 8, y + 6, 40, 22);

		if (jump) {
			print(image, fonts.black12, `to ${jump}`, x + 8, y + 28, 54, 20);
		}

		const players = playersByTile.get(tile) || [];
		players.slice(0, 4).forEach((player, index) => {
			const px = x + 12 + (index % 2) * 40;
			const py = y + 58 + Math.floor(index / 2) * 20;
			fillCircle(image, px + 12, py + 10, 13, COLORS.blue);
			print(image, fonts.white16, markerName(player), px + 2, py, 32, 20);
		});
	}

	for (const [fromText, to] of Object.entries(jumps)) {
		const from = Number(fromText);
		const start = snakesTilePosition(from, columns, rows);
		const end = snakesTilePosition(Number(to), columns, rows);
		const x0 = boardX + start.col * cell + cell / 2;
		const y0 = boardY + start.row * cell + cell / 2;
		const x1 = boardX + end.col * cell + cell / 2;
		const y1 = boardY + end.row * cell + cell / 2;
		const isLadder = Number(to) > from;

		drawLine(
			image,
			Math.round(x0),
			Math.round(y0),
			Math.round(x1),
			Math.round(y1),
			isLadder ? COLORS.green : COLORS.red,
			3
		);
	}

	const panelX = 48;
	const panelY = 642;
	fillRect(image, panelX, panelY, 960, 72, COLORS.card);
	strokeRect(image, panelX, panelY, 960, 72, COLORS.grid, 2);
	(session.players || []).slice(0, 8).forEach((player, index) => {
		const x = panelX + 18 + index * 116;
		const turn = session.turnIndex === index && session.status === "active";

		fillCircle(
			image,
			x + 16,
			panelY + 35,
			16,
			turn ? COLORS.gold : COLORS.blue
		);
		print(
			image,
			fonts.white16,
			markerName(player),
			x + 5,
			panelY + 25,
			34,
			22
		);
		print(
			image,
			fonts.black12,
			shortText(player.name, 11),
			x + 38,
			panelY + 18,
			72,
			18
		);
		print(
			image,
			fonts.black12,
			`tile ${player.position}`,
			x + 38,
			panelY + 39,
			72,
			18
		);
	});

	return toPngBuffer(image);
}
