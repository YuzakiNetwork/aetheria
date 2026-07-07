import {
	formatClassList,
	formatPlayerGuide,
	formatProfile,
	getPlayerId,
	getPlayerProfile,
	registerPlayer,
} from "#lib/rpg";

async function replyClassPicker(m) {
	const text = formatClassList(m.prefix);
	const buttons = [
		{ text: "Warrior", id: `${m.prefix}mulai warrior` },
		{ text: "Rogue", id: `${m.prefix}mulai rogue` },
		{ text: "Mage", id: `${m.prefix}mulai mage` },
		{ text: "Ranger", id: `${m.prefix}mulai ranger` },
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
}

async function replyStarterGuide(m, text) {
	const buttons = [
		{ text: "Misi Pemula", id: `${m.prefix}misi pemula` },
		{ text: "Daily", id: `${m.prefix}daily` },
		{ text: "Guild", id: `${m.prefix}guild` },
		{ text: "Guide", id: `${m.prefix}guide` },
		{ text: "Profil", id: `${m.prefix}profil` },
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
}

export default {
	name: "mulai",
	description: "Buat karakter baru.",
	command: ["mulai", "start", "register"],
	permissions: "all",
	category: "petualangan",
	cooldown: 5,
	usage: "$prefix$command <warrior|rogue|mage|ranger>",
	wait: null,

	async execute(m) {
		const userId = getPlayerId(m);
		const classInput = m.args[0];

		if (!classInput) {
			await replyClassPicker(m);
			return;
		}

		const result = await registerPlayer(userId, m.pushName, classInput);

		if (result.status === "invalid_class") {
			await replyClassPicker(m);
			return;
		}

		if (result.status === "exists") {
			const profile = await getPlayerProfile(userId, m.pushName);
			const player =
				profile.status === "ok" ? profile.player : result.player;

			await replyStarterGuide(
				m,
				[
					"📌 *Karakter Sudah Ada*",
					"Progress lama tetap dipakai.",
					"",
					formatPlayerGuide(player, m.prefix),
				].join("\n")
			);
			return;
		}

		await replyStarterGuide(
			m,
			[
				"🌌 *Karakter Dibuat*",
				"━━━━━━━━━━━━━━━━━━━━",
				`👤 Nama: *${result.player.name}*`,
				`🎒 Class: *${result.player.class}*`,
				"",
				formatProfile(result.player, m.prefix),
				"",
				formatPlayerGuide(result.player, m.prefix),
			].join("\n")
		);
	},
};
