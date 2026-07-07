import { formatComebackStatus, getPlayerId, getPlayerProfile } from "#lib/rpg";
import { replyMissingCharacter, replyRpgActions } from "#lib/rpgUi";

export default {
	name: "kembali",
	description: "Panduan cepat untuk pemain yang ingin aktif lagi.",
	command: ["kembali", "comeback", "balik"],
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

		await replyRpgActions(
			m,
			formatComebackStatus(result.player, m.prefix),
			"default",
			{
				footer: "Aetheria Comeback",
				buttons: [
					{ text: "Daily", id: `${m.prefix}daily` },
					{ text: "Tavern", id: `${m.prefix}tavern claim` },
					{ text: "RPG Hub", id: `${m.prefix}rpg` },
				],
			}
		);
	},
};
