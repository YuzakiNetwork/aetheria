import { MONSTERS } from "../content/world";
import { addItem, addLog, gainExp } from "./state";

export function startBattle(state, monsterKey, spawnId = null) {
	const monster = MONSTERS[monsterKey];

	state.battle = {
		spawnId,
		key: monsterKey,
		name: monster.name,
		texture: monster.texture,
		hp: monster.maxHp,
		maxHp: monster.maxHp,
		attack: monster.attack,
		exp: monster.exp,
		gold: monster.gold,
		drop: monster.drop,
		defending: false,
	};

	addLog(state, `${monster.name} muncul.`);
	return state.battle;
}

export function runBattleAction(state, action) {
	const battle = state.battle;
	const events = [];

	if (!battle) {
		return events;
	}

	if (action === "flee") {
		const escaped = Math.random() > 0.35;
		if (escaped) {
			events.push("Kamu berhasil mundur dari pertarungan.");
			state.battle = null;
			return events;
		}
		events.push("Gagal mundur.");
	}

	if (action === "defend") {
		battle.defending = true;
		events.push("Kamu mengambil posisi bertahan.");
	} else if (action === "skill") {
		const damage = Math.max(
			8,
			Math.round(state.player.power * 1.7 + randomRange(4, 10))
		);
		battle.hp = Math.max(0, battle.hp - damage);
		events.push(`Aether Slash mengenai ${battle.name} (${damage}).`);
	} else if (action === "attack") {
		const damage = Math.max(
			4,
			Math.round(state.player.power + randomRange(1, 7))
		);
		battle.hp = Math.max(0, battle.hp - damage);
		events.push(`Serangan masuk ke ${battle.name} (${damage}).`);
	}

	if (battle.hp <= 0) {
		events.push(`${battle.name} kalah.`);
		completeVictory(state, battle);
		return events;
	}

	const incoming = Math.max(
		1,
		Math.round(battle.attack + randomRange(0, 5) - state.player.defense)
	);
	const damageTaken = battle.defending ? Math.ceil(incoming / 2) : incoming;
	state.player.hp = Math.max(0, state.player.hp - damageTaken);
	battle.defending = false;
	events.push(`${battle.name} membalas (${damageTaken}).`);

	if (state.player.hp <= 0) {
		state.player.hp = Math.ceil(state.player.maxHp * 0.45);
		state.player.x = 11;
		state.player.y = 9;
		state.player.gold = Math.max(0, state.player.gold - 20);
		events.push("Aether tumbang dan kembali ke alun-alun.");
		state.battle = null;
	}

	return events;
}

function completeVictory(state, battle) {
	state.player.gold += battle.gold;
	gainExp(state, battle.exp);
	addItem(state, battle.drop);

	if (battle.spawnId && !state.defeated.includes(battle.spawnId)) {
		state.defeated.push(battle.spawnId);
	}

	if (
		state.quest.accepted &&
		!state.quest.claimed &&
		state.quest.target === battle.key
	) {
		state.quest.count = Math.min(
			state.quest.required,
			state.quest.count + 1
		);
	}

	addLog(
		state,
		`Menang: +${battle.exp} EXP, +${battle.gold} gold, ${battle.drop}.`
	);
	state.battle = null;
}

function randomRange(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
