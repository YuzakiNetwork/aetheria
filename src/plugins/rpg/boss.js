import {
	attackWorldBoss,
	formatWorldBossAttackResult,
	formatWorldBossStatus,
	getPlayerId,
	getWorldBossStatus,
} from "#lib/rpg";
import { replyMissingCharacter, replyRpgActions } from "#lib/rpgUi";

export default {
	name: "boss",
	description: "World Boss mini per grup dengan reward kontribusi damage.",
	command: ["boss", "worldboss", "serangboss", "raid"],
	permissions: "all",
	category: "petualangan",
	cooldown: 5,
	group: true,
	usage: ["$prefix$command", "$prefix$command serang", "$prefixserangboss"],
	wait: null,

	async execute(m) {
		const action = String(m.args[0] || "").toLowerCase();
		const shouldAttack =
			["serangboss", "raid"].includes(m.command) ||
			["serang", "attack", "hit", "hajar"].includes(action);

		if (shouldAttack) {
			const result = await attackWorldBoss(
				m.from,
				getPlayerId(m),
				m.pushName
			);

			if (result.status === "missing") {
				await replyMissingCharacter(m);
				return;
			}

			const preset =
				result.status === "low_hp"
					? "hpLow"
					: result.status === "no_energy"
						? "energyLow"
						: result.status === "cooldown"
							? "bossCooldown"
							: "boss";

			await replyRpgActions(
				m,
				formatWorldBossAttackResult(result, m.prefix),
				preset,
				{ footer: "Aetheria World Boss" }
			);
			return;
		}

		const result = await getWorldBossStatus(m.from);
		await replyRpgActions(
			m,
			formatWorldBossStatus(result, m.prefix),
			result.status === "cooldown" ? "bossCooldown" : "boss",
			{ footer: "Aetheria World Boss" }
		);
	},
};
