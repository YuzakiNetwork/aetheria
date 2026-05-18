import { formatInventory, getPlayerId, getPlayerProfile } from "#lib/rpg";

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
			await m.reply(
				[
					"🧭 *Belum Punya Karakter*",
					`Mulai dulu: \`${m.prefix}mulai warrior\``,
				].join("\n")
			);
			return;
		}

		await m.reply(formatInventory(result.player));
	},
};
