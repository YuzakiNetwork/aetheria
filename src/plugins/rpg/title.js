import {
	equipTitle,
	formatTitleBoard,
	formatTitleEquipResult,
	getPlayerId,
	getTitleStatus,
} from "#lib/rpg";

export default {
	name: "title",
	description: "Lihat dan pakai title dari achievement.",
	command: ["title", "titles", "gelar"],
	permissions: "all",
	category: "petualangan",
	cooldown: 5,
	usage: [
		"$prefix$command",
		"$prefix$command pakai <title>",
		"$prefix$command reset",
	],
	wait: null,

	async execute(m) {
		const action = String(m.args[0] || "").toLowerCase();

		if (["pakai", "equip", "set", "gunakan", "reset"].includes(action)) {
			const titleInput =
				action === "reset" ? "reset" : m.args.slice(1).join(" ");
			const result = await equipTitle(
				getPlayerId(m),
				m.pushName,
				titleInput
			);

			if (result.status === "missing") {
				await m.reply(
					[
						"🧭 *Belum Punya Karakter*",
						`Mulai dulu: \`${m.prefix}mulai warrior\``,
					].join("\n")
				);
				return;
			}

			await m.reply(formatTitleEquipResult(result, m.prefix));
			return;
		}

		const result = await getTitleStatus(getPlayerId(m), m.pushName);

		if (result.status === "missing") {
			await m.reply(
				[
					"🧭 *Belum Punya Karakter*",
					`Mulai dulu: \`${m.prefix}mulai warrior\``,
				].join("\n")
			);
			return;
		}

		await m.reply(formatTitleBoard(result, m.prefix));
	},
};
