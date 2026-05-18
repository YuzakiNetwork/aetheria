import {
	claimDaily,
	formatCooldown,
	formatDailyResult,
	getPlayerId,
} from "#lib/rpg";

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
			await m.reply(
				[
					"🧭 *Belum Punya Karakter*",
					`Mulai dulu: \`${m.prefix}mulai warrior\``,
				].join("\n")
			);
			return;
		}

		if (result.status === "cooldown") {
			await m.reply(
				`⏳ Daily sudah diambil.\nReset dalam *${formatCooldown(result.remaining)}*.`
			);
			return;
		}

		await m.reply(formatDailyResult(result));
	},
};
