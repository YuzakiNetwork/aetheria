import {
	awakenSkill,
	equipSkill,
	formatSkillStatus,
	getPlayerId,
	getSkillStatus,
	unequipSkill,
} from "#lib/rpg";

export default {
	name: "skill",
	description: "Lihat, pasang, dan awaken skill.",
	command: ["skill", "skills", "jurus"],
	permissions: "all",
	category: "petualangan",
	cooldown: 5,
	usage: [
		"$prefix$command",
		"$prefix$command equip <skill>",
		"$prefix$command unequip <skill>",
		"$prefix$command awaken <unique>",
	],
	wait: null,

	async execute(m) {
		const userId = getPlayerId(m);
		const action = String(m.args[0] || "").toLowerCase();
		const skillInput = m.args.slice(1).join(" ") || m.args[1];

		if (!action) {
			const result = await getSkillStatus(userId, m.pushName);

			if (result.status === "missing") {
				await m.reply(
					[
						"🧭 *Belum Punya Karakter*",
						`Mulai dulu: \`${m.prefix}mulai warrior\``,
					].join("\n")
				);
				return;
			}

			await m.reply(formatSkillStatus(result.player, m.prefix));
			return;
		}

		if (["equip", "pasang"].includes(action)) {
			if (!skillInput) {
				await m.reply(
					`✨ Contoh: \`${m.prefix}skill equip acid_touch\``
				);
				return;
			}

			const result = await equipSkill(userId, m.pushName, skillInput);

			if (result.status === "missing") {
				await m.reply(
					[
						"🧭 *Belum Punya Karakter*",
						`Mulai dulu: \`${m.prefix}mulai warrior\``,
					].join("\n")
				);
				return;
			}

			if (result.status === "invalid_skill") {
				await m.reply(
					`❌ Skill tidak dikenal.\nCek: \`${m.prefix}skill\``
				);
				return;
			}

			if (result.status === "not_owned") {
				await m.reply(
					`🔒 *${result.skill.name}* belum dimiliki.\nSerap dari monster lewat \`${m.prefix}jelajah\`.`
				);
				return;
			}

			if (result.status === "already_equipped") {
				await m.reply(`✅ *${result.skill.name}* sudah aktif.`);
				return;
			}

			if (result.status === "slots_full") {
				await m.reply(
					`⚠️ Slot skill penuh (*${result.slots}*).\nLepas dulu: \`${m.prefix}skill unequip <skill>\``
				);
				return;
			}

			await m.reply(`✨ Skill aktif: *${result.skill.name}*`);
			return;
		}

		if (["unequip", "lepas"].includes(action)) {
			if (!skillInput) {
				await m.reply(
					`✨ Contoh: \`${m.prefix}skill unequip acid_touch\``
				);
				return;
			}

			const result = await unequipSkill(userId, m.pushName, skillInput);

			if (result.status === "missing") {
				await m.reply(
					[
						"🧭 *Belum Punya Karakter*",
						`Mulai dulu: \`${m.prefix}mulai warrior\``,
					].join("\n")
				);
				return;
			}

			if (result.status === "invalid_skill") {
				await m.reply(
					`❌ Skill tidak dikenal.\nCek: \`${m.prefix}skill\``
				);
				return;
			}

			if (result.status === "not_equipped") {
				await m.reply(`📌 *${result.skill.name}* tidak sedang aktif.`);
				return;
			}

			await m.reply(`🧩 Skill dilepas: *${result.skill.name}*`);
			return;
		}

		if (["awaken", "bangkit", "unique"].includes(action)) {
			if (!skillInput) {
				await m.reply(
					`🌟 Contoh: \`${m.prefix}skill awaken predator_instinct\``
				);
				return;
			}

			const result = await awakenSkill(userId, m.pushName, skillInput);

			if (result.status === "missing") {
				await m.reply(
					[
						"🧭 *Belum Punya Karakter*",
						`Mulai dulu: \`${m.prefix}mulai warrior\``,
					].join("\n")
				);
				return;
			}

			if (result.status === "invalid_unique") {
				await m.reply(
					`❌ Unique skill tidak dikenal.\nCek daftar: \`${m.prefix}skill\``
				);
				return;
			}

			if (result.status === "already_owned") {
				await m.reply(`✅ *${result.skill.name}* sudah dimiliki.`);
				return;
			}

			if (result.status === "requirements") {
				await m.reply(
					[
						`🔒 *Belum bisa awaken ${result.skill.name}*`,
						`Kurang: ${result.missing.join(", ")}`,
						"",
						formatSkillStatus(result.player, m.prefix),
					].join("\n")
				);
				return;
			}

			await m.reply(
				[
					"🌟 *Unique Skill Awakened*",
					"━━━━━━━━━━━━━━━━━━━━",
					`✨ *${result.skill.name}*`,
					`_${result.skill.description}_`,
					"",
					`Cek: \`${m.prefix}skill\``,
				].join("\n")
			);
			return;
		}

		const result = await getSkillStatus(userId, m.pushName);

		if (result.status === "missing") {
			await m.reply(
				[
					"🧭 *Belum Punya Karakter*",
					`Mulai dulu: \`${m.prefix}mulai warrior\``,
				].join("\n")
			);
			return;
		}

		await m.reply(formatSkillStatus(result.player, m.prefix));
	},
};
