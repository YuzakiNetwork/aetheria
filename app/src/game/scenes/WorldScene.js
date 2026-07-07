import Phaser from "phaser";
import { runtime } from "../../runtime";
import {
	MAP_HEIGHT,
	MAP_WIDTH,
	MONSTERS,
	MONSTER_SPAWNS,
	NPCS,
	PLAYER_SPAWN,
	TILE_NAMES,
	TILE_SIZE,
	TILE_TEXTURES,
	WORLD_MAP,
	getTileAt,
	isWalkableTile,
} from "../content/world";
import { runBattleAction, startBattle } from "../simulation/combat";
import { addLog, gainExp, healPlayer, spendGold } from "../simulation/state";

const DIRECTIONS = {
	down: { x: 0, y: 1 },
	left: { x: -1, y: 0 },
	right: { x: 1, y: 0 },
	up: { x: 0, y: -1 },
};

export class WorldScene extends Phaser.Scene {
	constructor() {
		super("WorldScene");
		this.isMoving = false;
		this.monsterSprites = new Map();
	}

	create() {
		this.state = runtime.state;
		this.hud = runtime.hud;

		this.#drawMap();
		this.#createNpcs();
		this.#createMonsters();
		this.#createPlayer();
		this.#createInput();
		this.#bindHud();
		this.#syncCamera();
		this.#showWelcome();
		this.#refreshHud();
	}

	update() {
		if (!this.state || this.isMoving || this.state.battle) {
			return;
		}

		if (Phaser.Input.Keyboard.JustDown(this.keys.up)) {
			this.#tryMove("up");
		} else if (Phaser.Input.Keyboard.JustDown(this.keys.down)) {
			this.#tryMove("down");
		} else if (Phaser.Input.Keyboard.JustDown(this.keys.left)) {
			this.#tryMove("left");
		} else if (Phaser.Input.Keyboard.JustDown(this.keys.right)) {
			this.#tryMove("right");
		} else if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
			this.#interact();
		}
	}

	#drawMap() {
		for (let y = 0; y < MAP_HEIGHT; y += 1) {
			for (let x = 0; x < MAP_WIDTH; x += 1) {
				const tile = WORLD_MAP[y][x];
				this.add
					.image(
						x * TILE_SIZE + TILE_SIZE / 2,
						y * TILE_SIZE + TILE_SIZE / 2,
						TILE_TEXTURES[tile]
					)
					.setOrigin(0.5);
			}
		}
	}

	#createPlayer() {
		const player = this.state.player;

		if (!Number.isFinite(player.x) || !Number.isFinite(player.y)) {
			player.x = PLAYER_SPAWN.x;
			player.y = PLAYER_SPAWN.y;
		}

		this.playerSprite = this.add
			.sprite(
				player.x * TILE_SIZE + TILE_SIZE / 2,
				player.y * TILE_SIZE + TILE_SIZE / 2,
				"player"
			)
			.setDepth(10);
	}

	#createNpcs() {
		NPCS.forEach((npc) => {
			this.add
				.sprite(
					npc.x * TILE_SIZE + TILE_SIZE / 2,
					npc.y * TILE_SIZE + TILE_SIZE / 2,
					npc.texture
				)
				.setDepth(8);

			this.add
				.text(npc.x * TILE_SIZE + 16, npc.y * TILE_SIZE - 3, npc.name, {
					color: "#f7e7a1",
					fontFamily: "monospace",
					fontSize: "9px",
					stroke: "#18251e",
					strokeThickness: 3,
				})
				.setOrigin(0.5, 1)
				.setDepth(12);
		});
	}

	#createMonsters() {
		MONSTER_SPAWNS.forEach((spawn) => {
			if (this.state.defeated.includes(spawn.id)) {
				return;
			}

			const monster = MONSTERS[spawn.key];
			const sprite = this.add
				.sprite(
					spawn.x * TILE_SIZE + TILE_SIZE / 2,
					spawn.y * TILE_SIZE + TILE_SIZE / 2,
					monster.texture
				)
				.setDepth(7);

			this.tweens.add({
				targets: sprite,
				y: sprite.y - 4,
				duration: 650,
				yoyo: true,
				repeat: -1,
				ease: "Sine.easeInOut",
			});
			this.monsterSprites.set(spawn.id, sprite);
		});
	}

	#createInput() {
		this.keys = {
			down: this.input.keyboard.addKey(
				Phaser.Input.Keyboard.KeyCodes.DOWN
			),
			interact: this.input.keyboard.addKey(
				Phaser.Input.Keyboard.KeyCodes.E
			),
			left: this.input.keyboard.addKey(
				Phaser.Input.Keyboard.KeyCodes.LEFT
			),
			right: this.input.keyboard.addKey(
				Phaser.Input.Keyboard.KeyCodes.RIGHT
			),
			up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
		};

		this.input.keyboard
			.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
			.on("down", () => this.#interact());
		this.input.keyboard
			.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
			.on("down", () => this.#interact());
		this.input.keyboard
			.addKey(Phaser.Input.Keyboard.KeyCodes.W)
			.on("down", () => this.#tryMove("up"));
		this.input.keyboard
			.addKey(Phaser.Input.Keyboard.KeyCodes.A)
			.on("down", () => this.#tryMove("left"));
		this.input.keyboard
			.addKey(Phaser.Input.Keyboard.KeyCodes.S)
			.on("down", () => this.#tryMove("down"));
		this.input.keyboard
			.addKey(Phaser.Input.Keyboard.KeyCodes.D)
			.on("down", () => this.#tryMove("right"));
	}

	#bindHud() {
		this.hud.onMove((direction) => this.#tryMove(direction));
		this.hud.onInteract(() => this.#interact());
		this.hud.setBattleActions({
			attack: () => this.#battleAction("attack"),
			defend: () => this.#battleAction("defend"),
			flee: () => this.#battleAction("flee"),
			skill: () => this.#battleAction("skill"),
		});
	}

	#syncCamera() {
		this.cameras.main.setBounds(
			0,
			0,
			MAP_WIDTH * TILE_SIZE,
			MAP_HEIGHT * TILE_SIZE
		);
		this.cameras.main.startFollow(this.playerSprite, true, 0.16, 0.16);
	}

	#showWelcome() {
		if (this.state.log.length > 2) {
			return;
		}

		this.hud.showDialog(
			"Aetheria",
			"Kota awal sudah aktif. Ambil quest, kalahkan slime, lalu kembali untuk klaim reward.",
			[
				{
					label: "Mulai",
					onClick: () => this.hud.hideDialog(),
				},
			]
		);
	}

	#tryMove(direction) {
		if (this.isMoving || this.state.battle) {
			return;
		}

		const delta = DIRECTIONS[direction];
		const player = this.state.player;
		player.facing = direction;

		const nextX = player.x + delta.x;
		const nextY = player.y + delta.y;
		const tile = getTileAt(nextX, nextY);

		if (!isWalkableTile(tile) || this.#findNpcAt(nextX, nextY)) {
			this.#describeBlockedTile(tile);
			this.#refreshHud();
			return;
		}

		player.x = nextX;
		player.y = nextY;
		this.isMoving = true;
		this.tweens.add({
			targets: this.playerSprite,
			x: nextX * TILE_SIZE + TILE_SIZE / 2,
			y: nextY * TILE_SIZE + TILE_SIZE / 2,
			duration: 120,
			onComplete: () => {
				this.isMoving = false;
				this.#afterMove();
			},
		});
		runtime.save();
	}

	#afterMove() {
		const monsterSpawn = this.#findMonsterAt(
			this.state.player.x,
			this.state.player.y
		);

		if (monsterSpawn) {
			this.#startMonsterBattle(monsterSpawn);
			return;
		}

		if (getTileAt(this.state.player.x, this.state.player.y) === "P") {
			this.#startRiftBattle();
			return;
		}

		this.#refreshHud();
	}

	#interact() {
		if (this.state.battle) {
			return;
		}

		const target = this.#getInteractionTarget();

		if (!target) {
			const tile = getTileAt(this.state.player.x, this.state.player.y);
			addLog(this.state, `Area sekitar: ${TILE_NAMES[tile]}.`);
			this.#refreshHud();
			return;
		}

		if (target.kind === "npc") {
			this.#talkToNpc(target.data);
			return;
		}

		if (target.kind === "monster") {
			this.#startMonsterBattle(target.data);
			return;
		}

		this.#startRiftBattle();
	}

	#talkToNpc(npc) {
		if (npc.type === "quest") {
			this.#handleQuestBoard();
			return;
		}

		if (npc.type === "blacksmith") {
			this.#handleBlacksmith(npc);
			return;
		}

		if (npc.type === "healer") {
			this.#handleHealer(npc);
			return;
		}

		this.hud.showDialog(
			npc.name,
			"Guild Hall akan jadi tempat party, squad, dan raid sinkron dengan bot WhatsApp.",
			[
				{
					label: "Tutup",
					onClick: () => this.hud.hideDialog(),
				},
			]
		);
	}

	#handleQuestBoard() {
		const quest = this.state.quest;

		if (!quest.accepted) {
			this.hud.showDialog(quest.name, quest.description, [
				{
					label: "Ambil",
					onClick: () => {
						quest.accepted = true;
						addLog(this.state, `Quest diterima: ${quest.name}.`);
						this.hud.hideDialog();
						this.#refreshHud();
					},
				},
				{
					label: "Nanti",
					onClick: () => this.hud.hideDialog(),
				},
			]);
			return;
		}

		if (quest.count < quest.required) {
			this.hud.showDialog(
				quest.name,
				`Progress ${quest.count}/${quest.required}. Cari Moss Slime di luar kota.`,
				[
					{
						label: "Tutup",
						onClick: () => this.hud.hideDialog(),
					},
				]
			);
			return;
		}

		if (!quest.claimed) {
			this.hud.showDialog(
				quest.name,
				`Quest selesai. Reward: ${quest.rewardGold} gold dan ${quest.rewardExp} EXP.`,
				[
					{
						label: "Klaim",
						onClick: () => {
							quest.claimed = true;
							this.state.player.gold += quest.rewardGold;
							gainExp(this.state, quest.rewardExp);
							addLog(this.state, "Reward First Hunt diklaim.");
							this.hud.hideDialog();
							this.#refreshHud();
						},
					},
				]
			);
			return;
		}

		this.hud.showDialog(
			"Quest Board",
			"Quest berikutnya belum dibuka di MVP ini.",
			[
				{
					label: "Tutup",
					onClick: () => this.hud.hideDialog(),
				},
			]
		);
	}

	#handleBlacksmith(npc) {
		this.hud.showDialog(
			npc.name,
			"Upgrade senjata seharga 70 gold. Power +3.",
			[
				{
					label: "Upgrade",
					onClick: () => {
						if (!spendGold(this.state, 70)) {
							addLog(
								this.state,
								"Gold belum cukup untuk upgrade."
							);
						} else {
							this.state.player.power += 3;
							addLog(this.state, "Senjata di-upgrade. Power +3.");
						}
						this.hud.hideDialog();
						this.#refreshHud();
					},
				},
				{
					label: "Tutup",
					onClick: () => this.hud.hideDialog(),
				},
			]
		);
	}

	#handleHealer(npc) {
		this.hud.showDialog(npc.name, "Pulihkan HP penuh seharga 25 gold.", [
			{
				label: "Heal",
				onClick: () => {
					if (!spendGold(this.state, 25)) {
						addLog(this.state, "Gold belum cukup untuk heal.");
					} else {
						healPlayer(this.state, this.state.player.maxHp);
						addLog(this.state, "HP dipulihkan oleh Mira.");
					}
					this.hud.hideDialog();
					this.#refreshHud();
				},
			},
			{
				label: "Tutup",
				onClick: () => this.hud.hideDialog(),
			},
		]);
	}

	#startMonsterBattle(spawn) {
		const battle = startBattle(this.state, spawn.key, spawn.id);
		this.hud.showBattle(battle, `${battle.name} menghalangi jalan.`);
		this.#refreshHud();
	}

	#startRiftBattle() {
		const battle = startBattle(this.state, "riftling");
		this.hud.showBattle(battle, "Portal bergerak dan Riftling keluar.");
		this.#refreshHud();
	}

	#battleAction(action) {
		if (!this.state.battle) {
			return;
		}

		const previousSpawn = this.state.battle.spawnId;
		const events = runBattleAction(this.state, action);
		const message = events.join(" ");

		if (!this.state.battle) {
			this.hud.hideBattle();
			if (previousSpawn) {
				this.monsterSprites.get(previousSpawn)?.destroy();
			}
			this.#syncPlayerSprite();
		} else {
			this.hud.updateBattle(this.state.battle, message);
		}

		events.forEach((event) => addLog(this.state, event));
		this.#refreshHud();
	}

	#getInteractionTarget() {
		const player = this.state.player;
		const facing = DIRECTIONS[player.facing] || DIRECTIONS.down;
		const positions = [
			{ x: player.x + facing.x, y: player.y + facing.y },
			{ x: player.x, y: player.y },
			{ x: player.x, y: player.y - 1 },
			{ x: player.x + 1, y: player.y },
			{ x: player.x, y: player.y + 1 },
			{ x: player.x - 1, y: player.y },
		];

		for (const position of positions) {
			const npc = this.#findNpcAt(position.x, position.y);
			if (npc) {
				return { kind: "npc", data: npc };
			}

			const monster = this.#findMonsterAt(position.x, position.y);
			if (monster) {
				return { kind: "monster", data: monster };
			}

			if (getTileAt(position.x, position.y) === "P") {
				return { kind: "portal" };
			}
		}

		return null;
	}

	#findNpcAt(x, y) {
		return NPCS.find((npc) => npc.x === x && npc.y === y);
	}

	#findMonsterAt(x, y) {
		return MONSTER_SPAWNS.find(
			(spawn) =>
				spawn.x === x &&
				spawn.y === y &&
				!this.state.defeated.includes(spawn.id)
		);
	}

	#describeBlockedTile(tile) {
		const names = {
			M: "Pegunungan belum bisa dilewati.",
			T: "Hutan rapat menutup jalan.",
			W: "Sungai terlalu deras.",
		};
		addLog(this.state, names[tile] || "Ada sesuatu di depan.");
	}

	#syncPlayerSprite() {
		this.playerSprite.setPosition(
			this.state.player.x * TILE_SIZE + TILE_SIZE / 2,
			this.state.player.y * TILE_SIZE + TILE_SIZE / 2
		);
	}

	#refreshHud() {
		this.hud.update();
		runtime.save();
	}
}
