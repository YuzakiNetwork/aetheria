import { getPlayerId } from "#lib/rpg";
import {
	createSquad,
	formatSquadCreateResult,
	formatSquadJoinResult,
	formatSquadLeaveResult,
	formatSquadStatus,
	getSquadByWhatsApp,
	joinSquad,
	leaveSquad,
} from "#lib/supabase/squads";

export default {
	name: "squad",
	description: "Buat squad untuk dungeon, raid, dan fitur grup RPG.",
	command: ["squad", "party", "tim"],
	permissions: "all",
	category: "petualangan",
	cooldown: 5,
	usage: [
		"$prefix$command",
		"$prefix$command buat <nama>",
		"$prefix$command join <kode>",
		"$prefix$command leave",
	],
	wait: null,

	async execute(m) {
		const action = String(m.args[0] || "").toLowerCase();

		if (!action) {
			const result = await getSquadByWhatsApp(getPlayerId(m));

			if (result.status === "missing") {
				await m.reply(formatSquadStatus(result, m.prefix));
				return;
			}

			if (result.status !== "ok") {
				await m.reply(
					`Gagal cek squad: ${result.error?.message || result.status}`
				);
				return;
			}

			await m.reply(formatSquadStatus(result, m.prefix));
			return;
		}

		if (["buat", "create", "new"].includes(action)) {
			const name = m.args.slice(1).join(" ");
			const result = await createSquad({
				whatsappJid: getPlayerId(m),
				displayName: m.pushName,
				name,
			});

			if (result.status === "already_in_squad") {
				await m.reply(formatSquadJoinResult(result, m.prefix));
				return;
			}

			if (result.status !== "ok") {
				await m.reply(
					`Gagal buat squad: ${result.error?.message || result.status}`
				);
				return;
			}

			await m.reply(formatSquadCreateResult(result, m.prefix));
			return;
		}

		if (["join", "masuk"].includes(action)) {
			const code = m.args[1];
			const result = await joinSquad({
				whatsappJid: getPlayerId(m),
				displayName: m.pushName,
				code,
			});

			if (result.status === "invalid_code") {
				await m.reply(
					`👥 Masukkan kode squad.\nContoh: \`${m.prefix}squad join A1B2C3\``
				);
				return;
			}

			if (result.status === "missing_squad") {
				await m.reply(
					"❌ Squad tidak ditemukan atau sudah dibubarkan."
				);
				return;
			}

			if (result.status === "full") {
				await m.reply("👥 Squad sudah penuh.");
				return;
			}

			if (
				result.status !== "ok" &&
				result.status !== "already_in_squad"
			) {
				await m.reply(
					`Gagal join squad: ${result.error?.message || result.status}`
				);
				return;
			}

			await m.reply(formatSquadJoinResult(result, m.prefix));
			return;
		}

		if (["leave", "keluar"].includes(action)) {
			const result = await leaveSquad(getPlayerId(m));

			if (result.status === "missing") {
				await m.reply("👥 Kamu belum masuk squad.");
				return;
			}

			if (!["left", "disbanded"].includes(result.status)) {
				await m.reply(
					`Gagal keluar squad: ${result.error?.message || result.status}`
				);
				return;
			}

			await m.reply(formatSquadLeaveResult(result));
			return;
		}

		const result = await getSquadByWhatsApp(getPlayerId(m));
		await m.reply(formatSquadStatus(result, m.prefix));
	},
};
