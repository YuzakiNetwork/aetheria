import { formatProfile, getPlayerId, getPlayerProfile } from "#lib/rpg";

export default {
	name: "profil",
	description: "Lihat status karakter.",
	command: ["profil", "profile", "status"],
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

		await m.reply(formatProfile(result.player, m.prefix));
	},
};
