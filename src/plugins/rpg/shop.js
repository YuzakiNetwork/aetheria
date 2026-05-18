import { formatShop } from "#lib/rpg";

export default {
	name: "toko",
	description: "Lihat item dan gear yang bisa dibeli.",
	command: ["shop", "toko"],
	permissions: "all",
	category: "petualangan",
	cooldown: 3,
	wait: null,

	async execute(m) {
		await m.reply(formatShop(m.prefix));
	},
};
