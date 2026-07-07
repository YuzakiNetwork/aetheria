import {
	claimDaily,
	formatCooldown,
	formatDailyResult,
	getPlayerId,
} from "#lib/rpg";
import { replyMissingCharacter, replyRpgActions } from "#lib/rpgUi";

export default {
	name: "daily",
	description: "Ambil reward harian.",
	command: ["daily", "harian"],
	permissions: "all",
	category: "petualangan",
	cooldown: 5,
	wait: null,

	async execute(m) {
		const result = await claimDaily(getPlayerId(m), m.pushName);

		if (result.status === "missing") {
			await replyMissingCharacter(m);
			return;
		}

		if (result.status === "cooldown") {
			await replyRpgActions(
				m,
				`⏳ Daily sudah diambil.\nReset dalam *${formatCooldown(result.remaining)}*.`,
				"daily",
				{ footer: "Aetheria Daily" }
			);
			return;
		}

		await replyRpgActions(m, formatDailyResult(result), "daily", {
			footer: "Aetheria Daily",
		});
	},
};
