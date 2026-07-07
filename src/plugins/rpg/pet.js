import {
	equipPet,
	formatPetEquipResult,
	formatPetStatus,
	formatPetSummonResult,
	getPetStatus,
	getPlayerId,
	summonPet,
} from "#lib/rpg";

export default {
	name: "pet",
	description: "Koleksi companion, summon pet, dan pakai bonus pet aktif.",
	command: ["pet", "pets", "companion", "pendamping"],
	permissions: "all",
	category: "petualangan",
	cooldown: 5,
	usage: [
		"$prefix$command",
		"$prefix$command summon",
		"$prefix$command pakai <pet>",
		"$prefix$command lepas",
	],
	wait: null,

	async execute(m) {
		const action = String(m.args[0] || "").toLowerCase();

		if (["summon", "panggil", "gacha"].includes(action)) {
			const result = await summonPet(getPlayerId(m), m.pushName);

			if (result.status === "missing") {
				await m.reply(
					[
						"🧭 *Belum Punya Karakter*",
						`Mulai dulu: \`${m.prefix}mulai warrior\``,
					].join("\n")
				);
				return;
			}

			await m.reply(formatPetSummonResult(result, m.prefix));
			return;
		}

		if (
			["pakai", "equip", "set", "gunakan", "lepas", "reset"].includes(
				action
			)
		) {
			const petInput = ["lepas", "reset"].includes(action)
				? "lepas"
				: m.args.slice(1).join(" ");
			const result = await equipPet(getPlayerId(m), m.pushName, petInput);

			if (result.status === "missing") {
				await m.reply(
					[
						"🧭 *Belum Punya Karakter*",
						`Mulai dulu: \`${m.prefix}mulai warrior\``,
					].join("\n")
				);
				return;
			}

			await m.reply(formatPetEquipResult(result, m.prefix));
			return;
		}

		const result = await getPetStatus(getPlayerId(m), m.pushName);

		if (result.status === "missing") {
			await m.reply(
				[
					"🧭 *Belum Punya Karakter*",
					`Mulai dulu: \`${m.prefix}mulai warrior\``,
				].join("\n")
			);
			return;
		}

		await m.reply(formatPetStatus(result, m.prefix));
	},
};
