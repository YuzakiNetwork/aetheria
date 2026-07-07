import {
	formatAdventureResult,
	formatProfile,
	getPlayerId,
	getPlayerProfile,
	runAdventure,
} from "#lib/rpg";
import { replyMissingCharacter, replyRpgActions } from "#lib/rpgUi";
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
			await replyMissingCharacter(m);
			return;
		}

		const guild = await requireGuildMembership(userId, "adventurer");

		if (guild.status === "missing_guild") {
			await replyRpgActions(
				m,
				formatMissingGuild(guild.requiredGuild, m.prefix),
				"starter",
				{ footer: "Aetheria Guild" }
			);
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
			await replyRpgActions(
				m,
				[
					"❤️ *HP Terlalu Rendah*",
					`Pakai potion: \`${m.prefix}heal\``,
					"",
					formatProfile(result.player, m.prefix),
				].join("\n"),
				"hpLow"
			);
			return;
		}

		if (result.status === "no_energy") {
			await replyRpgActions(
				m,
				[
					"⚡ *Energi Kurang*",
					`Butuh energi: *${result.needed}*`,
					`Isi energi: \`${m.prefix}daily\` atau \`${m.prefix}beli ether\``,
				].join("\n"),
				"energyLow"
			);
			return;
		}

		await replyRpgActions(m, formatAdventureResult(result), "adventure", {
			footer: "Aetheria Adventure",
		});
	},
};
