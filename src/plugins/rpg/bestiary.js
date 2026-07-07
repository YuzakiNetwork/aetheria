import {
	buildBestiaryTable,
	formatBestiary,
	getBestiaryStatus,
	getPlayerId,
} from "#lib/rpg";
import { replyMissingCharacter } from "#lib/rpgUi";

export default {
	name: "bestiary",
	description: "Lihat data monster, stat dasar, dan skill absorb per zona.",
	command: ["bestiary", "codex", "monster", "monsters"],
	permissions: "all",
	category: "petualangan",
	cooldown: 5,
	usage: [
		"$prefix$command",
		"$prefix$command tabel [zona]",
		"$prefix$command <zona>",
		"$prefix$command semua",
	],
	wait: null,

	async execute(m) {
		const action = String(m.args[0] || "").toLowerCase();
		const wantsTable = ["table", "tabel", "stat", "stats"].includes(action);
		const zoneInput = wantsTable
			? m.args.slice(1).join(" ")
			: m.args.join(" ");
		const result = await getBestiaryStatus(
			getPlayerId(m),
			m.pushName,
			zoneInput
		);

		if (result.status === "missing") {
			await replyMissingCharacter(m);
			return;
		}

		if (wantsTable && typeof m.replyTable === "function") {
			const table = buildBestiaryTable(result, m.prefix);

			if (table) {
				await m.replyTable(table);
				return;
			}
		}

		const text = formatBestiary(result, m.prefix);
		const buttons = [
			{ text: "Jelajah", id: `${m.prefix}jelajah` },
			{
				text: "Zona",
				sections: [
					{
						title: "Bestiary",
						rows: [
							{
								title: "Zona aktif",
								description: "Lihat monster zona aktif",
								id: `${m.prefix}bestiary`,
							},
							{
								title: "Semua zona terbuka",
								description:
									"Gabungkan monster yang sudah unlock",
								id: `${m.prefix}bestiary semua`,
							},
							{
								title: "Tabel monster",
								description:
									"Tampilkan stat dalam table message",
								id: `${m.prefix}bestiary tabel`,
							},
							{
								title: "Map",
								description: "Lihat daftar zona",
								id: `${m.prefix}map`,
							},
						],
					},
				],
			},
			{ text: "Skill", id: `${m.prefix}skill` },
		];

		if (typeof m.replyInteractive === "function") {
			await m.replyInteractive(text, buttons, {
				footer: "Aetheria Bestiary",
			});
			return;
		}

		await m.reply(text);
	},
};
