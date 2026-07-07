import { getBotNumber } from "#lib/community";
import { SettingsModel } from "#lib/database/index";
import {
	DEFAULT_HALL_OF_FAME_TARGET,
	HALL_OF_FAME_INTERVAL_MS,
	formatHallOfFameStatus,
	formatWeeklyHallOfFame,
	getHallOfFameEntries,
	runWeeklyHallOfFameTick,
	sendWeeklyHallOfFame,
} from "#lib/hallOfFame";
import { normalizeJidTarget } from "#lib/jid";

function getHelp(prefix = ".", command = "hof") {
	return [
		"🏆 *Weekly Hall of Fame*",
		"━━━━━━━━━━━━━━━━━━━━",
		`${prefix}${command}`,
		`${prefix}${command} status`,
		`${prefix}${command} send`,
		`${prefix}${command} send <jid/nomor/idgrup>`,
		"",
		"Preview bisa dipakai semua user. Pengiriman manual hanya owner.",
	].join("\n");
}

async function replyHallOfFame(m, text, command) {
	const buttons = [
		{
			text: "Leaderboard",
			id: `${m.prefix}leaderboard`,
		},
		{
			text: "RPG",
			id: `${m.prefix}rpg`,
		},
		{
			text: "Update",
			id: `${m.prefix}update latest`,
		},
	];

	if (typeof m.replyInteractive === "function") {
		await m.replyInteractive(text, buttons, {
			footer: "Aetheria Hall of Fame",
		});
		return;
	}

	if (typeof m.replyButtons === "function") {
		await m.replyButtons(text, buttons, {
			footer: "Aetheria Hall of Fame",
		});
		return;
	}

	await m.reply(`${text}\n\n${getHelp(m.prefix, command)}`);
}

export default {
	name: "halloffame",
	description: "Weekly Hall of Fame RPG dan announcement mingguan.",
	command: ["hof", "halloffame", "hall", "weeklyhof"],
	permissions: "all",
	category: "info",
	cooldown: 10,
	usage: "$prefix$command [status|send]",
	wait: null,
	react: true,
	periodic: {
		enabled: true,
		type: "interval",
		interval: HALL_OF_FAME_INTERVAL_MS,
		run: async function (_, { sock }) {
			await runWeeklyHallOfFameTick(sock);
		},
	},

	async execute(m, { command, isOwner, sock }) {
		const action = String(m.args[0] || "preview")
			.toLowerCase()
			.trim();

		if (["help", "bantuan"].includes(action)) {
			await m.reply(getHelp(m.prefix, command));
			return;
		}

		if (["status", "jadwal"].includes(action)) {
			const settings = await SettingsModel.getSettings();
			await m.reply(formatHallOfFameStatus(settings));
			return;
		}

		if (["send", "kirim"].includes(action)) {
			if (!isOwner) {
				await m.reply("Command kirim Hall of Fame hanya untuk owner.");
				return;
			}

			const target =
				normalizeJidTarget(m.args[1] || "") ||
				DEFAULT_HALL_OF_FAME_TARGET;
			const result = await sendWeeklyHallOfFame(sock, {
				botNumber: getBotNumber(sock),
				force: true,
				prefix: m.prefix,
				target,
			});

			if (result.status !== "sent") {
				await m.reply(
					`Gagal kirim Hall of Fame: ${result.error?.message || result.status}`
				);
				return;
			}

			await m.reply(
				[
					"✅ *Hall of Fame terkirim*",
					`Target: ${result.target}`,
					`Week: ${result.weekKey}`,
					`Message ID: ${result.messageId || "-"}`,
				].join("\n")
			);
			return;
		}

		const entries = await getHallOfFameEntries(50);
		await replyHallOfFame(
			m,
			formatWeeklyHallOfFame(entries, {
				botNumber: getBotNumber(sock),
				prefix: m.prefix,
			}),
			command
		);
	},
};
