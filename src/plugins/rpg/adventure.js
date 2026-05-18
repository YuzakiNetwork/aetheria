import {
	formatAdventureResult,
	formatProfile,
	getPlayerId,
	getPlayerProfile,
	runAdventure,
} from "#lib/rpg";
import {
	formatMissingGuild,
	requireGuildMembership,
} from "#lib/supabase/guilds";

export default {
	name: "jelajah",
	description: "Cari monster dan dapatkan XP, gold, serta item.",
	command: ["jelajah", "adventure", "berburu", "hunt"],
	permissions: "all",
	category: "petualangan",
	cooldown: 20,
	wait: "Menjelajah...",

	async execute(m) {
		const userId = getPlayerId(m);
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

		const guild = await requireGuildMembership(userId, "adventurer");

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

		const result = await runAdventure(userId, m.pushName);

		if (result.status === "low_hp") {
			await m.reply(
				[
					"❤️ *HP Terlalu Rendah*",
					`Pakai potion: \`${m.prefix}heal\``,
					"",
					formatProfile(result.player, m.prefix),
				].join("\n")
			);
			return;
		}

		if (result.status === "no_energy") {
			await m.reply(
				[
					"⚡ *Energi Kurang*",
					`Butuh energi: *${result.needed}*`,
					`Isi energi: \`${m.prefix}daily\` atau \`${m.prefix}beli ether\``,
				].join("\n")
			);
			return;
		}

		await m.reply(formatAdventureResult(result));
	},
};
