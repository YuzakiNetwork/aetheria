import { getPlayerId } from "#lib/rpg";
import {
	formatGuildJoinResult,
	formatGuildStatus,
	getGuildStatusByWhatsApp,
	registerGuildMembership,
} from "#lib/supabase/guilds";

export default {
	name: "guild",
	description: "Daftar Guild Petualang atau Guild Pedagang.",
	command: ["guild", "guilds", "profesi"],
	permissions: "all",
	category: "petualangan",
	cooldown: 5,
	usage: ["$prefix$command", "$prefix$command <petualang|pedagang>"],
	wait: null,

	async execute(m) {
		const action = String(m.args[0] || "").toLowerCase();
		const guildInput = ["daftar", "join", "masuk"].includes(action)
			? m.args[1]
			: m.args[0];

		if (!guildInput) {
			const result = await getGuildStatusByWhatsApp(getPlayerId(m));

			if (result.status !== "ok") {
				await m.reply(
					`Gagal cek guild: ${result.error?.message || result.status}`
				);
				return;
			}

			await m.reply(formatGuildStatus(result, m.prefix));
			return;
		}

		const result = await registerGuildMembership({
			whatsappJid: getPlayerId(m),
			displayName: m.pushName,
			guildKey: guildInput,
		});

		if (result.status === "invalid_guild") {
			await m.reply(
				[
					"🏛️ *Guild tidak dikenal*",
					`Pilih: \`${m.prefix}guild petualang\` atau \`${m.prefix}guild pedagang\``,
				].join("\n")
			);
			return;
		}

		if (result.status !== "ok" && result.status !== "already_joined") {
			await m.reply(
				`Gagal daftar guild: ${result.error?.message || result.status}`
			);
			return;
		}

		await m.reply(formatGuildJoinResult(result));
	},
};
