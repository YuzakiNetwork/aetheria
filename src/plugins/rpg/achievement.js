import {
	formatAchievementBoard,
	getAchievementStatus,
	getPlayerId,
} from "#lib/rpg";

export default {
	name: "achievement",
	description: "Lihat progress achievement dan title yang bisa dibuka.",
	command: ["achievement", "achievements", "ach", "prestasi"],
	permissions: "all",
	category: "petualangan",
	cooldown: 5,
	usage: "$prefix$command",
	wait: null,

	async execute(m) {
		const result = await getAchievementStatus(getPlayerId(m), m.pushName);

		if (result.status === "missing") {
			await m.reply(
				[
					"🧭 *Belum Punya Karakter*",
					`Mulai dulu: \`${m.prefix}mulai warrior\``,
				].join("\n")
			);
			return;
		}

		await m.reply(formatAchievementBoard(result, m.prefix));
	},
};
