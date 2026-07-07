import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
	constructor() {
		super("BootScene");
	}

	create() {
		this.#createTiles();
		this.#createActors();
		this.scene.start("WorldScene");
	}

	#createTiles() {
		const graphics = this.make.graphics({ x: 0, y: 0, add: false });

		this.#tile(graphics, "tile-grass", 0x315c2b, [
			[4, 6, 0x4f8d43],
			[22, 12, 0x274c28],
			[12, 24, 0x6c9c45],
		]);
		this.#tile(graphics, "tile-road", 0x8b7346, [
			[5, 9, 0xb89b5e],
			[18, 20, 0x6d5435],
		]);
		this.#tile(graphics, "tile-cobble", 0x565861, [
			[3, 3, 0x777985],
			[18, 8, 0x3b3e46],
			[9, 22, 0x878a96],
		]);
		this.#tile(graphics, "tile-water", 0x244a73, [
			[4, 10, 0x3c78a8],
			[20, 18, 0x18324f],
		]);
		this.#tile(graphics, "tile-tree", 0x223820, [
			[8, 6, 0x3f7040],
			[17, 13, 0x2d5a32],
			[12, 23, 0x172918],
		]);
		this.#tile(graphics, "tile-mountain", 0x615a56, [
			[8, 5, 0x8a8179],
			[18, 18, 0x3b3838],
		]);
		this.#tile(graphics, "tile-dungeon", 0x3d3846, [
			[5, 7, 0x695d79],
			[20, 20, 0x24212e],
		]);
		this.#tile(graphics, "tile-portal", 0x2f2e5f, [
			[8, 8, 0x49c6a8],
			[16, 16, 0xd8b765],
			[21, 8, 0x8e3e3a],
		]);
	}

	#createActors() {
		const graphics = this.make.graphics({ x: 0, y: 0, add: false });

		this.#actor(graphics, "player", 0xd8b765, 0x425d86, 0xf2df9f);
		this.#actor(graphics, "npc-smith", 0x8e3e3a, 0x615a56, 0xf0c27b);
		this.#actor(graphics, "npc-healer", 0x49a57d, 0xe9d27f, 0xf0c27b);
		this.#actor(graphics, "npc-guild", 0x425d86, 0xd8b765, 0xf0c27b);

		graphics.clear();
		graphics.fillStyle(0x6d5435);
		graphics.fillRect(6, 6, 20, 20);
		graphics.fillStyle(0xd8b765);
		graphics.fillRect(9, 9, 14, 4);
		graphics.fillRect(9, 16, 14, 4);
		graphics.generateTexture("npc-board", 32, 32);

		this.#monster(graphics, "monster-slime", 0x49a57d, 0xdaf2c2);
		this.#monster(graphics, "monster-wolf", 0x6c6f7d, 0xd8b765);
		this.#monster(graphics, "monster-riftling", 0x6f4b8b, 0x49c6a8);
	}

	#tile(graphics, key, base, accents) {
		graphics.clear();
		graphics.fillStyle(base);
		graphics.fillRect(0, 0, 32, 32);
		accents.forEach(([x, y, color]) => {
			graphics.fillStyle(color);
			graphics.fillRect(x, y, 6, 6);
		});
		graphics.lineStyle(1, 0x18251e, 0.32);
		graphics.strokeRect(0, 0, 32, 32);
		graphics.generateTexture(key, 32, 32);
	}

	#actor(graphics, key, body, trim, face) {
		graphics.clear();
		graphics.fillStyle(0x181818, 0.3);
		graphics.fillRect(7, 27, 18, 4);
		graphics.fillStyle(face);
		graphics.fillRect(10, 4, 12, 10);
		graphics.fillStyle(body);
		graphics.fillRect(7, 14, 18, 13);
		graphics.fillStyle(trim);
		graphics.fillRect(7, 20, 18, 4);
		graphics.fillStyle(0x18251e);
		graphics.fillRect(12, 8, 3, 3);
		graphics.fillRect(18, 8, 3, 3);
		graphics.generateTexture(key, 32, 32);
	}

	#monster(graphics, key, body, eye) {
		graphics.clear();
		graphics.fillStyle(0x181818, 0.28);
		graphics.fillRect(6, 26, 20, 4);
		graphics.fillStyle(body);
		graphics.fillRect(6, 12, 20, 15);
		graphics.fillRect(10, 8, 12, 6);
		graphics.fillStyle(eye);
		graphics.fillRect(11, 15, 3, 3);
		graphics.fillRect(19, 15, 3, 3);
		graphics.generateTexture(key, 32, 32);
	}
}
