import { formatProfile, getPlayerId, getPlayerProfile } from "#lib/rpg";
import { replyMissingCharacter } from "#lib/rpgUi";
import { getPremiumStatusByWhatsApp } from "#lib/supabase/monetization";

export default {
	name: "profil",
	description: "Lihat status karakter.",
	command: ["profil", "profile", "status"],
	permissions: "all",
	category: "petualangan",
	cooldown: 3,
	wait: null,

	async execute(m) {
		const userId = getPlayerId(m);
		const result = await getPlayerProfile(userId, m.pushName);

		if (result.status === "missing") {
			await replyMissingCharacter(m);
			return;
		}

		const premium = await getPremiumStatusByWhatsApp(userId).catch(
			() => null
		);
		const player = {
			...result.player,
			premium:
				premium?.status === "ok"
					? premium.snapshot
					: result.player.premium,
		};
		const text = formatProfile(player, m.prefix);
		const buttons = [
			{ text: "Misi", id: `${m.prefix}misi pemula` },
			{ text: "Achievement", id: `${m.prefix}achievement` },
			{ text: "Bestiary", id: `${m.prefix}bestiary` },
			{ text: "Dungeon", id: `${m.prefix}dungeon` },
			{ text: "Pet", id: `${m.prefix}pet` },
		];

		if (typeof m.replyInteractive === "function") {
			await m.replyInteractive(text, buttons, {
				footer: "Aetheria RPG",
			});
			return;
		}

		if (typeof m.replyButtons === "function") {
			await m.replyButtons(text, buttons, {
				footer: "Aetheria RPG",
			});
			return;
		}

		await m.reply(text);
	},
};
