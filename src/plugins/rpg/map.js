import {
	formatWorldMap,
	getPlayerId,
	getPlayerProfile,
	setPlayerZone,
} from "#lib/rpg";

export default {
	name: "map",
	description: "Lihat zona dan monster yang tersedia.",
	command: ["map", "peta", "zona"],
	permissions: "all",
	category: "petualangan",
	cooldown: 3,
	usage: ["$prefix$command", "$prefix$command <zona|nomor>"],
	wait: null,

	async execute(m) {
		const zoneInput = m.args.join(" ");
		const result = await getPlayerProfile(getPlayerId(m), m.pushName);

		if (result.status === "missing") {
			await m.reply(
				[
					formatWorldMap(null, m.prefix),
					"",
					`🧭 Belum punya karakter. Mulai: \`${m.prefix}mulai warrior\``,
				].join("\n")
			);
			return;
		}

		if (!zoneInput) {
			await m.reply(formatWorldMap(result.player, m.prefix));
			return;
		}

		const change = await setPlayerZone(
			getPlayerId(m),
			m.pushName,
			zoneInput
		);

		if (change.status === "invalid_zone") {
			await m.reply(
				[
					"❌ *Map tidak ditemukan*",
					`Cek daftar: \`${m.prefix}map\``,
				].join("\n")
			);
			return;
		}

		if (change.status === "locked") {
			await m.reply(
				[
					`🔒 *${change.zone.name} belum terbuka*`,
					`Butuh Lv ${change.requiredLevel}. Level kamu: *${change.player.level}*`,
					"",
					formatWorldMap(change.player, m.prefix),
				].join("\n")
			);
			return;
		}

		await m.reply(
			[
				"✅ *Map Diganti*",
				"━━━━━━━━━━━━━━━━━━━━",
				`🗺️ Zona aktif: *${change.zone.name}*`,
				"",
				formatWorldMap(change.player, m.prefix),
			].join("\n")
		);
	},
};
