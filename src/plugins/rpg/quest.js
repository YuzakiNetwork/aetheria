import {
	claimQuestReward,
	formatQuestBoard,
	formatQuestClaimResult,
	getPlayerId,
	getQuestStatus,
} from "#lib/rpg";
import { replyMissingCharacter, replyRpgActions } from "#lib/rpgUi";

export default {
	name: "misi",
	description: "Lihat dan klaim misi harian, mingguan, dan guild.",
	command: ["misi", "quest", "quests"],
	permissions: "all",
	category: "petualangan",
	cooldown: 5,
	usage: [
		"$prefix$command",
		"$prefix$command pemula|harian|mingguan|guild",
		"$prefix$command claim [semua|id]",
	],
	wait: null,

	async execute(m) {
		const userId = getPlayerId(m);
		const action = String(m.args[0] || "").toLowerCase();

		if (["claim", "klaim", "ambil"].includes(action)) {
			const result = await claimQuestReward(
				userId,
				m.pushName,
				m.args.slice(1).join(" ") || "ready"
			);

			if (result.status === "missing") {
				await replyMissingCharacter(m);
				return;
			}

			if (result.status === "nothing_ready") {
				await replyRpgActions(
					m,
					[
						"📜 *Belum Ada Misi Siap Claim*",
						"",
						formatQuestBoard(result, m.prefix),
					].join("\n"),
					"quest",
					{ footer: "Aetheria Quest" }
				);
				return;
			}

			await replyRpgActions(
				m,
				formatQuestClaimResult(result, m.prefix),
				"quest",
				{ footer: "Aetheria Quest" }
			);
			return;
		}

		const type =
			{
				pemula: "beginner",
				beginner: "beginner",
				tutorial: "beginner",
				harian: "daily",
				daily: "daily",
				mingguan: "weekly",
				weekly: "weekly",
				guild: "guild",
			}[action || "all"] || "all";
		const result = await getQuestStatus(userId, m.pushName, type);

		if (result.status === "missing") {
			await replyMissingCharacter(m);
			return;
		}

		const text = formatQuestBoard(result, m.prefix);
		const sections = [
			{
				title: "Kategori Misi",
				rows: [
					{
						title: "Pemula",
						description: "Questline awal untuk pemain baru",
						id: `${m.prefix}misi pemula`,
					},
					{
						title: "Harian",
						description: "Misi reset 24 jam",
						id: `${m.prefix}misi harian`,
					},
					{
						title: "Mingguan",
						description: "Target progress mingguan",
						id: `${m.prefix}misi mingguan`,
					},
					{
						title: "Guild",
						description: "Misi sesuai guild aktif",
						id: `${m.prefix}misi guild`,
					},
				],
			},
			{
				title: "Aksi",
				rows: [
					{
						title: "Claim siap",
						description: "Ambil semua reward yang sudah siap",
						id: `${m.prefix}misi claim`,
					},
					{
						title: "Lihat semua",
						description: "Gabungkan semua kategori misi",
						id: `${m.prefix}misi`,
					},
				],
			},
		];

		if (typeof m.replyList === "function") {
			await m.replyList(text, sections, {
				buttonText: "Pilih Misi",
				footer: "Aetheria Quest",
				title: "Misi Aetheria",
			});
			return;
		}

		await m.reply(text);
	},
};
