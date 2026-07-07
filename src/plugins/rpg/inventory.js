import { formatInventory, getPlayerId, getPlayerProfile } from "#lib/rpg";
import { replyMissingCharacter, replyRpgActions } from "#lib/rpgUi";

export default {
	name: "inventory",
	description: "Lihat item, gold, dan gear.",
	command: ["inventory", "inv", "tas"],
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

		await replyRpgActions(m, formatInventory(result.player), "inventory", {
			footer: "Aetheria Inventory",
		});
	},
};
