import {
	formatClassList,
	formatProfile,
	getPlayerId,
	registerPlayer,
} from "#lib/rpg";

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
			await m.reply(formatClassList(m.prefix));
			return;
		}

		const result = await registerPlayer(userId, m.pushName, classInput);

		if (result.status === "invalid_class") {
			await m.reply(formatClassList(m.prefix));
			return;
		}

		if (result.status === "exists") {
			await m.reply(
				[
					"📌 *Karakter Sudah Ada*",
					"Progress lama tetap dipakai.",
					"",
					formatProfile(result.player, m.prefix),
				].join("\n")
			);
			return;
		}

		await m.reply(
			[
				"🌌 *Karakter Dibuat*",
				"━━━━━━━━━━━━━━━━━━━━",
				`👤 Nama: *${result.player.name}*`,
				`🎒 Class: *${result.player.class}*`,
				"",
				formatProfile(result.player, m.prefix),
			].join("\n")
		);
	},
};
