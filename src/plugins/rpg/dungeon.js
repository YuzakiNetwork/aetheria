import { formatDungeonResult, getPlayerId, runSquadDungeon } from "#lib/rpg";
import { replyRpgActions } from "#lib/rpgUi";

export default {
	name: "dungeon",
	description: "Jalankan dungeon mini bersama squad aktif.",
	command: ["dungeon", "dun", "ruin"],
	permissions: "all",
	category: "petualangan",
	cooldown: 30,
	usage: ["$prefix$command"],
	wait: "Menyiapkan dungeon squad...",

	async execute(m) {
		const result = await runSquadDungeon(getPlayerId(m), m.pushName);
		const text = formatDungeonResult(result, m.prefix);
		const buttons = [
			{ text: "Squad", id: `${m.prefix}squad` },
			{ text: "Misi", id: `${m.prefix}misi harian` },
			{ text: "Heal", id: `${m.prefix}heal` },
		];

		await replyRpgActions(m, text, "default", {
			buttons,
			footer: "Aetheria Dungeon",
		});
	},
};
