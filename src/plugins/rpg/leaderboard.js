import { formatLeaderboard, getLeaderboard } from "#lib/rpg";

export default {
	name: "leaderboard",
	description: "Lihat ranking karakter.",
	command: ["leaderboard", "rank", "lb"],
	permissions: "all",
	category: "petualangan",
	cooldown: 8,
	wait: null,

	async execute(m) {
		const entries = await getLeaderboard(10);

		await m.reply(formatLeaderboard(entries, m.prefix));
	},
};
