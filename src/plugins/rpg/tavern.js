import {
	claimTavernRewards,
	formatTavernBoard,
	formatTavernClaimResult,
	getPlayerId,
	getTavernBoard,
} from "#lib/rpg";
import { replyMissingCharacter, replyRpgActions } from "#lib/rpgUi";

export default {
	name: "tavern",
	description: "Papan aktivitas harian dan mingguan Aetheria.",
	command: ["tavern", "board", "papan"],
	permissions: "all",
	category: "petualangan",
	cooldown: 5,
	usage: "$prefix$command [claim|daily|weekly]",
	wait: null,
	react: true,

	async execute(m, { args }) {
		const action = String(args[0] || "")
			.toLowerCase()
			.trim();

		if (["claim", "klaim", "ambil"].includes(action)) {
			const result = await claimTavernRewards(
				getPlayerId(m),
				m.pushName,
				args[1] || "ready"
			);

			if (result.status === "missing") {
				await replyMissingCharacter(m);
				return;
			}

			if (result.status === "nothing_ready") {
				await replyRpgActions(
					m,
					[
						"🍻 *Belum Ada Reward Tavern*",
						"Belum ada task yang siap diklaim.",
						"",
						`Cek progress: \`${m.prefix}tavern\``,
					].join("\n"),
					"daily",
					{ footer: "Aetheria Tavern" }
				);
				return;
			}

			await replyRpgActions(
				m,
				formatTavernClaimResult(result, m.prefix),
				"daily",
				{ footer: "Aetheria Tavern" }
			);
			return;
		}

		const type = ["daily", "harian"].includes(action)
			? "daily"
			: ["weekly", "mingguan"].includes(action)
				? "weekly"
				: "all";
		const result = await getTavernBoard(getPlayerId(m), m.pushName, type);

		if (result.status === "missing") {
			await replyMissingCharacter(m);
			return;
		}

		await replyRpgActions(m, formatTavernBoard(result, m.prefix), "daily", {
			footer: "Aetheria Tavern",
			buttons: [
				{ text: "Claim", id: `${m.prefix}tavern claim` },
				{ text: "Daily", id: `${m.prefix}daily` },
				{ text: "Jelajah", id: `${m.prefix}jelajah` },
				{ text: "Kerja", id: `${m.prefix}kerja mine` },
				{ text: "RPG", id: `${m.prefix}rpg` },
			],
		});
	},
};
