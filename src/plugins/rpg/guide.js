import { formatPlayerGuide, getPlayerId, getPlayerProfile } from "#lib/rpg";
import { replyMissingCharacter } from "#lib/rpgUi";

export default {
	name: "guide",
	description:
		"Lihat arahan bermain berikutnya berdasarkan progress karakter.",
	command: ["guide", "arah", "panduan", "next"],
	permissions: "all",
	category: "petualangan",
	cooldown: 3,
	wait: null,

	async execute(m) {
		const result = await getPlayerProfile(getPlayerId(m), m.pushName);

		if (result.status === "missing") {
			await replyMissingCharacter(m);
			return;
		}

		const text = formatPlayerGuide(result.player, m.prefix);
		const buttons = [
			{ text: "Progress", id: `${m.prefix}progress` },
			{ text: "Misi", id: `${m.prefix}misi` },
			{ text: "Daily", id: `${m.prefix}daily` },
			{ text: "Guild", id: `${m.prefix}guild` },
			{ text: "Upgrade", id: `${m.prefix}upgrade` },
		];

		if (typeof m.replyInteractive === "function") {
			await m.replyInteractive(text, buttons, {
				footer: "Aetheria Guide",
			});
			return;
		}

		if (typeof m.replyButtons === "function") {
			await m.replyButtons(text, buttons, {
				footer: "Aetheria Guide",
			});
			return;
		}

		await m.reply(text);
	},
};
