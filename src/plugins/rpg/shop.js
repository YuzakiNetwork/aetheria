import { formatShop } from "#lib/rpg";
import { replyRpgActions } from "#lib/rpgUi";

export default {
	name: "toko",
	description: "Lihat item dan gear yang bisa dibeli.",
	command: ["shop", "toko"],
	permissions: "all",
	category: "petualangan",
	cooldown: 3,
	wait: null,

	async execute(m) {
		await replyRpgActions(m, formatShop(m.prefix), "shop", {
			footer: "Aetheria Shop",
		});
	},
};
