import {
	evolveRace,
	formatEvolutionResult,
	formatRaceStatus,
	getPlayerId,
	getRaceStatus,
} from "#lib/rpg";

export default {
	name: "race",
	description: "Lihat ras dan evolusi karakter.",
	command: ["race", "ras", "evolve", "evolusi"],
	permissions: "all",
	category: "petualangan",
	cooldown: 5,
	usage: "$prefix$command [target_race]",
	wait: null,

	async execute(m) {
		const userId = getPlayerId(m);
		const target = m.args[0];
		const wantsEvolve = ["evolve", "evolusi"].includes(m.command);

		if (!target && !wantsEvolve) {
			const result = await getRaceStatus(userId, m.pushName);

			if (result.status === "missing") {
				await m.reply(
					[
						"🧭 *Belum Punya Karakter*",
						`Mulai dulu: \`${m.prefix}mulai warrior\``,
					].join("\n")
				);
				return;
			}

			await m.reply(formatRaceStatus(result.player, m.prefix));
			return;
		}

		if (!target) {
			const result = await getRaceStatus(userId, m.pushName);

			if (result.status === "missing") {
				await m.reply(
					[
						"🧭 *Belum Punya Karakter*",
						`Mulai dulu: \`${m.prefix}mulai warrior\``,
					].join("\n")
				);
				return;
			}

			await m.reply(formatRaceStatus(result.player, m.prefix));
			return;
		}

		const result = await evolveRace(userId, m.pushName, target);

		if (result.status === "missing") {
			await m.reply(
				[
					"🧭 *Belum Punya Karakter*",
					`Mulai dulu: \`${m.prefix}mulai warrior\``,
				].join("\n")
			);
			return;
		}

		if (result.status === "invalid_race") {
			await m.reply(`❌ Race tidak dikenal.\nCek: \`${m.prefix}race\``);
			return;
		}

		if (result.status === "not_available") {
			await m.reply(
				`🔒 *${result.target.name}* belum bisa diambil dari *${result.race.name}*.\nCek: \`${m.prefix}race\``
			);
			return;
		}

		if (result.status === "requirements") {
			await m.reply(
				[
					`🔒 *Belum memenuhi syarat evolusi ke ${result.target.name}*`,
					`Kurang: ${result.missing.join(", ")}`,
					"",
					formatRaceStatus(result.player, m.prefix),
				].join("\n")
			);
			return;
		}

		await m.reply(formatEvolutionResult(result, m.prefix));
	},
};
