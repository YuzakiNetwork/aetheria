import {
	formatJobResult,
	getPlayerId,
	getPlayerProfile,
	runJob,
} from "#lib/rpg";
import {
	replyMissingCharacter,
	replyRpgActions,
	replyRpgList,
} from "#lib/rpgUi";
import {
	formatMissingGuild,
	requireGuildMembership,
} from "#lib/supabase/guilds";

const JOB_SECTIONS = (prefix) => [
	{
		title: "Pilihan Kerja",
		rows: [
			{
				title: "Nambang",
				description: "Cari ore dan material tambang",
				id: `${prefix}kerja mine`,
			},
			{
				title: "Forage",
				description: "Kumpulkan material alam",
				id: `${prefix}kerja forage`,
			},
			{
				title: "Mancing",
				description: "Cari ikan dan material air",
				id: `${prefix}kerja fish`,
			},
		],
	},
	{
		title: "Aksi Lain",
		rows: [
			{
				title: "Misi Harian",
				description: "Cek target kerja harian",
				id: `${prefix}misi harian`,
			},
			{
				title: "Inventory",
				description: "Lihat material hasil kerja",
				id: `${prefix}inventory`,
			},
		],
	},
];

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
			await replyMissingCharacter(m);
			return;
		}

		const guild = await requireGuildMembership(userId, "merchant");

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

		const result = await runJob(userId, m.pushName, jobInput);

		if (result.status === "invalid_job") {
			await replyRpgList(
				m,
				[
					"🧰 *Pilihan Kerja*",
					`Contoh: \`${m.prefix}kerja mine\``,
				].join("\n"),
				JOB_SECTIONS(m.prefix),
				{
					buttonText: "Pilih Kerja",
					footer: "Aetheria Work",
					title: "Kerja Aetheria",
				}
			);
			return;
		}

		if (result.status === "no_energy") {
			await replyRpgActions(
				m,
				`⚡ Energi kurang. Butuh *${result.needed}*.`,
				"energyLow",
				{ footer: "Aetheria Work" }
			);
			return;
		}

		await replyRpgActions(m, formatJobResult(result), "work", {
			footer: "Aetheria Work",
		});
	},
};
