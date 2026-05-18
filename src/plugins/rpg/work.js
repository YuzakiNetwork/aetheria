import {
	formatJobResult,
	getPlayerId,
	getPlayerProfile,
	runJob,
} from "#lib/rpg";
import {
	formatMissingGuild,
	requireGuildMembership,
} from "#lib/supabase/guilds";

export default {
	name: "kerja",
	description: "Farming gold, XP, dan material dengan risiko rendah.",
	command: ["kerja", "work", "nambang", "mancing"],
	permissions: "all",
	category: "petualangan",
	cooldown: 15,
	usage: "$prefix$command [mine|forage|fish]",
	wait: null,

	async execute(m) {
		const userId = getPlayerId(m);
		const jobInput =
			m.command === "nambang"
				? "mine"
				: m.command === "mancing"
					? "fish"
					: m.args[0];
		const profile = await getPlayerProfile(userId, m.pushName);

		if (profile.status === "missing") {
			await m.reply(
				[
					"🧭 *Belum Punya Karakter*",
					`Mulai dulu: \`${m.prefix}mulai warrior\``,
				].join("\n")
			);
			return;
		}

		const guild = await requireGuildMembership(userId, "merchant");

		if (guild.status === "missing_guild") {
			await m.reply(formatMissingGuild(guild.requiredGuild, m.prefix));
			return;
		}

		if (guild.status !== "ok") {
			await m.reply(
				`Gagal cek guild: ${guild.error?.message || guild.status}`
			);
			return;
		}

		const result = await runJob(userId, m.pushName, jobInput);

		if (result.status === "invalid_job") {
			await m.reply(
				[
					"🧰 *Pilihan Kerja*",
					"• mine",
					"• forage",
					"• fish",
					"",
					`Contoh: \`${m.prefix}kerja mine\``,
				].join("\n")
			);
			return;
		}

		if (result.status === "no_energy") {
			await m.reply(`⚡ Energi kurang. Butuh *${result.needed}*.`);
			return;
		}

		await m.reply(formatJobResult(result));
	},
};
