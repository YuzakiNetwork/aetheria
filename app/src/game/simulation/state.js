const SAVE_KEY = "aetheria.pixel-rpg.save.v1";

export function createInitialState() {
	return {
		player: {
			name: "Aether",
			level: 1,
			exp: 0,
			nextExp: 80,
			hp: 120,
			maxHp: 120,
			power: 14,
			defense: 4,
			gold: 80,
			x: 11,
			y: 9,
			facing: "down",
		},
		inventory: ["rusty sword", "traveler cloak", "small potion"],
		quest: {
			id: "first-hunt",
			name: "First Hunt",
			description: "Kalahkan 2 Moss Slime di sekitar kota.",
			target: "slime",
			required: 2,
			count: 0,
			rewardGold: 90,
			rewardExp: 45,
			claimed: false,
			accepted: false,
		},
		defeated: [],
		log: [
			"Bangun di alun-alun Aetheria.",
			"Tekan E/Space untuk bicara atau gunakan tombol tengah.",
		],
		battle: null,
	};
}

export function loadGameState() {
	if (typeof localStorage === "undefined") {
		return createInitialState();
	}

	try {
		const raw = localStorage.getItem(SAVE_KEY);
		if (!raw) {
			return createInitialState();
		}

		return {
			...createInitialState(),
			...JSON.parse(raw),
		};
	} catch {
		return createInitialState();
	}
}

export function saveGameState(state) {
	if (typeof localStorage === "undefined") {
		return;
	}

	localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function addLog(state, message) {
	state.log.unshift(message);
	state.log = state.log.slice(0, 7);
}

export function addItem(state, item) {
	if (!state.inventory.includes(item)) {
		state.inventory.push(item);
	}
}

export function gainExp(state, amount) {
	const player = state.player;
	player.exp += amount;

	while (player.exp >= player.nextExp) {
		player.exp -= player.nextExp;
		player.level += 1;
		player.nextExp = Math.round(player.nextExp * 1.45);
		player.maxHp += 16;
		player.power += 3;
		player.defense += 1;
		player.hp = player.maxHp;
		addLog(state, `Level up! Aether sekarang Lv. ${player.level}.`);
	}
}

export function spendGold(state, amount) {
	if (state.player.gold < amount) {
		return false;
	}

	state.player.gold -= amount;
	return true;
}

export function healPlayer(state, amount) {
	state.player.hp = Math.min(state.player.maxHp, state.player.hp + amount);
}
