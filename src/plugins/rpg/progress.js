import { formatPlayerProgress, getPlayerId, getPlayerProfile } from "#lib/rpg";
import { replyMissingCharacter } from "#lib/rpgUi";

export default {
	name: "progress",
	description: "Lihat checklist perkembangan karakter RPG.",
	command: ["progress", "progres", "roadmap"],
	permissions: "all",
	category: "petualangan",
	cooldown: 3,
	wait: null,

	async execute(m) {
		const result = await getPlayerProfile(getPlayerId(m), m.pushName);

		if (result.status === "missing") {
			await replyMissingCharacter(m);
			return;
		}

		const text = formatPlayerProgress(result.player, m.prefix);
		const buttons = [
			{ text: "Guide", id: `${m.prefix}guide` },
			{ text: "Misi", id: `${m.prefix}misi` },
			{ text: "Achievement", id: `${m.prefix}achievement` },
			{ text: "Pet", id: `${m.prefix}pet` },
			{ text: "Dungeon", id: `${m.prefix}dungeon` },
		];

		if (typeof m.replyInteractive === "function") {
			await m.replyInteractive(text, buttons, {
				footer: "Aetheria Progress",
			});
			return;
		}

		if (typeof m.replyButtons === "function") {
			await m.replyButtons(text, buttons, {
				footer: "Aetheria Progress",
			});
			return;
		}

		await m.reply(text);
	},
};
