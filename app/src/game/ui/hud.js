export function createHud(state) {
	const elements = {
		level: document.querySelector("#hud-level"),
		hp: document.querySelector("#hud-hp"),
		gold: document.querySelector("#hud-gold"),
		power: document.querySelector("#hud-power"),
		quest: document.querySelector("#quest-text"),
		inventory: document.querySelector("#inventory-list"),
		log: document.querySelector("#activity-log"),
		dialog: document.querySelector("#dialog-panel"),
		dialogTitle: document.querySelector("#dialog-title"),
		dialogBody: document.querySelector("#dialog-body"),
		dialogActions: document.querySelector("#dialog-actions"),
		battle: document.querySelector("#battle-panel"),
		battleName: document.querySelector("#battle-name"),
		battleHp: document.querySelector("#battle-hp"),
		battleHpFill: document.querySelector("#battle-hp-fill"),
		battleLog: document.querySelector("#battle-log"),
		attack: document.querySelector("#battle-attack"),
		skill: document.querySelector("#battle-skill"),
		defend: document.querySelector("#battle-defend"),
		flee: document.querySelector("#battle-flee"),
	};

	const listeners = {
		interact: new Set(),
		move: new Set(),
	};

	document.querySelectorAll("[data-move]").forEach((button) => {
		button.addEventListener("pointerdown", () => {
			emit(listeners.move, button.dataset.move);
		});
	});

	document
		.querySelector("[data-action='interact']")
		?.addEventListener("pointerdown", () => {
			emit(listeners.interact);
		});

	return {
		onMove(callback) {
			listeners.move.add(callback);
		},
		onInteract(callback) {
			listeners.interact.add(callback);
		},
		setBattleActions(actions) {
			elements.attack.onclick = () => actions.attack?.();
			elements.skill.onclick = () => actions.skill?.();
			elements.defend.onclick = () => actions.defend?.();
			elements.flee.onclick = () => actions.flee?.();
		},
		showDialog(title, body, actions = []) {
			elements.dialogTitle.textContent = title;
			elements.dialogBody.textContent = body;
			elements.dialogActions.replaceChildren(
				...actions.map((action) => {
					const button = document.createElement("button");
					button.type = "button";
					button.textContent = action.label;
					button.addEventListener("click", action.onClick);
					return button;
				})
			);
			elements.dialog.hidden = false;
		},
		hideDialog() {
			elements.dialog.hidden = true;
		},
		showBattle(battle, message) {
			elements.battle.hidden = false;
			this.updateBattle(battle, message);
		},
		updateBattle(battle, message = "") {
			if (!battle) {
				elements.battle.hidden = true;
				return;
			}

			const percent = Math.max(
				0,
				Math.round((battle.hp / battle.maxHp) * 100)
			);
			elements.battleName.textContent = battle.name;
			elements.battleHp.textContent = `${battle.hp}/${battle.maxHp}`;
			elements.battleHpFill.style.width = `${percent}%`;
			elements.battleLog.textContent =
				message || "Pilih aksi sebelum monster menyerang.";
		},
		hideBattle() {
			elements.battle.hidden = true;
		},
		update() {
			const player = state.player;
			elements.level.textContent = `Lv. ${player.level}`;
			elements.hp.textContent = `${player.hp}/${player.maxHp}`;
			elements.gold.textContent = player.gold.toLocaleString("id-ID");
			elements.power.textContent = player.power;
			elements.quest.textContent = getQuestText(state);
			elements.inventory.replaceChildren(
				...state.inventory.map((item) => {
					const li = document.createElement("li");
					li.textContent = item;
					return li;
				})
			);
			elements.log.replaceChildren(
				...state.log.map((entry) => {
					const li = document.createElement("li");
					li.textContent = entry;
					return li;
				})
			);
		},
	};
}

function emit(listeners, payload) {
	listeners.forEach((listener) => listener(payload));
}

function getQuestText(state) {
	const quest = state.quest;

	if (quest.claimed) {
		return "Quest awal selesai. Kota siap untuk fitur berikutnya.";
	}

	if (!quest.accepted) {
		return "Belum ada quest aktif. Bicara dengan Quest Board di tengah kota.";
	}

	if (quest.count >= quest.required) {
		return `${quest.name}: selesai. Kembali ke Quest Board untuk klaim reward.`;
	}

	return `${quest.name}: ${quest.count}/${quest.required} ${quest.description}`;
}
