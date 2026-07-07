import {
	formatGearUpgradeFailure,
	formatGearUpgradeResult,
	formatGearUpgradeStatus,
	getGearUpgradeStatus,
	getPlayerId,
	upgradeGearSlot,
} from "#lib/rpg";

export default {
	name: "upgrade",
	description:
		"Tempa gear untuk menaikkan stat slot weapon, armor, atau charm.",
	command: ["upgrade", "enhance", "tempa"],
	permissions: "all",
	category: "petualangan",
	cooldown: 8,
	usage: ["$prefix$command", "$prefix$command <weapon|armor|charm>"],
	wait: null,

	async execute(m) {
		const slotInput = m.args[0];
		const userId = getPlayerId(m);

		if (!slotInput) {
			const result = await getGearUpgradeStatus(userId, m.pushName);

			if (result.status === "missing") {
				await m.reply(
					[
						"🧭 *Belum Punya Karakter*",
						`Mulai dulu: \`${m.prefix}mulai warrior\``,
					].join("\n")
				);
				return;
			}

			await m.reply(formatGearUpgradeStatus(result, m.prefix));
			return;
		}

		const result = await upgradeGearSlot(userId, m.pushName, slotInput);

		if (result.status === "missing") {
			await m.reply(
				[
					"🧭 *Belum Punya Karakter*",
					`Mulai dulu: \`${m.prefix}mulai warrior\``,
				].join("\n")
			);
			return;
		}

		if (result.status !== "ok") {
			await m.reply(formatGearUpgradeFailure(result, m.prefix));
			return;
		}

		await m.reply(formatGearUpgradeResult(result, m.prefix));
	},
};
