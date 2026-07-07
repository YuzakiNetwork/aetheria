import { getPlayerId, getPlayerProfile } from "#lib/rpg";
import { buildRpgHomeSections, formatRpgHome, replyRpgList } from "#lib/rpgUi";

export default {
	name: "rpg",
	description: "Buka pusat aksi RPG interaktif Aetheria.",
	command: ["rpg", "aetheria", "menurpg", "menu-rpg"],
	permissions: "all",
	category: "petualangan",
	cooldown: 3,
	wait: null,

	async execute(m) {
		const result = await getPlayerProfile(getPlayerId(m), m.pushName);
		const player = result.status === "ok" ? result.player : null;
		const text = formatRpgHome(player, m.prefix);

		await replyRpgList(m, text, buildRpgHomeSections(m.prefix), {
			buttonText: "Pilih Aksi",
			footer: "Aetheria RPG",
			title: "Aetheria RPG Hub",
		});
	},
};
