export const TILE_SIZE = 32;
export const MAP_WIDTH = 24;
export const MAP_HEIGHT = 18;
export const PLAYER_SPAWN = { x: 11, y: 9 };

export const TILE_TEXTURES = {
	C: "tile-cobble",
	D: "tile-dungeon",
	G: "tile-grass",
	M: "tile-mountain",
	P: "tile-portal",
	R: "tile-road",
	T: "tile-tree",
	W: "tile-water",
};

export const TILE_NAMES = {
	C: "cobble",
	D: "dungeon",
	G: "grass",
	M: "ridge",
	P: "portal",
	R: "road",
	T: "forest",
	W: "water",
};

export const NPCS = [
	{
		id: "quest-board",
		name: "Quest Board",
		texture: "npc-board",
		x: 10,
		y: 7,
		type: "quest",
	},
	{
		id: "blacksmith",
		name: "Raka",
		texture: "npc-smith",
		x: 7,
		y: 9,
		type: "blacksmith",
	},
	{
		id: "healer",
		name: "Mira",
		texture: "npc-healer",
		x: 13,
		y: 8,
		type: "healer",
	},
	{
		id: "guild-master",
		name: "Veyra",
		texture: "npc-guild",
		x: 16,
		y: 10,
		type: "guild",
	},
];

export const MONSTER_SPAWNS = [
	{
		id: "slime-1",
		key: "slime",
		x: 5,
		y: 5,
	},
	{
		id: "slime-2",
		key: "slime",
		x: 19,
		y: 5,
	},
	{
		id: "wolf-1",
		key: "wolf",
		x: 19,
		y: 13,
	},
];

export const MONSTERS = {
	slime: {
		name: "Moss Slime",
		texture: "monster-slime",
		maxHp: 34,
		attack: 8,
		exp: 14,
		gold: 18,
		drop: "slime gel",
	},
	wolf: {
		name: "Rift Wolf",
		texture: "monster-wolf",
		maxHp: 54,
		attack: 12,
		exp: 26,
		gold: 34,
		drop: "wolf fang",
	},
	riftling: {
		name: "Riftling",
		texture: "monster-riftling",
		maxHp: 72,
		attack: 15,
		exp: 42,
		gold: 60,
		drop: "rift shard",
	},
};

export function createWorldMap() {
	return Array.from({ length: MAP_HEIGHT }, (_, y) =>
		Array.from({ length: MAP_WIDTH }, (_, x) => {
			if (
				x === 0 ||
				y === 0 ||
				x === MAP_WIDTH - 1 ||
				y === MAP_HEIGHT - 1
			) {
				return "T";
			}

			if (x >= 21 && y <= 6) {
				return "M";
			}

			if ((x === 2 || x === 3) && y >= 11 && y <= 15) {
				return "W";
			}

			if (x >= 8 && x <= 17 && y >= 7 && y <= 11) {
				return "C";
			}

			if (x === 11 || y === 9) {
				return "R";
			}

			if (x === 20 && y === 14) {
				return "P";
			}

			if (x >= 18 && x <= 21 && y >= 12 && y <= 15) {
				return "D";
			}

			if ((x + y) % 9 === 0 || (x * y) % 17 === 0) {
				return "T";
			}

			return "G";
		}).join("")
	);
}

export const WORLD_MAP = createWorldMap();

export function getTileAt(x, y) {
	return WORLD_MAP[y]?.[x] || "T";
}

export function isWalkableTile(tile) {
	return ["C", "D", "G", "P", "R"].includes(tile);
}
