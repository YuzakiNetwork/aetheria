import { formatUseItemResult, getPlayerId, useConsumable } from "#lib/rpg";

export default {
	name: "heal",
	description: "Pakai potion atau ether.",
	command: ["heal", "minum", "use"],
	permissions: "all",
	category: "petualangan",
	cooldown: 5,
	usage: "$prefix$command [potion|ether]",
	wait: null,

	async execute(m) {
		const result = await useConsumable(
			getPlayerId(m),
			m.pushName,
			m.args[0] || "potion"
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

		if (result.status === "not_consumable") {
			await m.reply("❌ Item itu tidak bisa dipakai langsung.");
			return;
		}

		if (result.status === "no_item") {
			await m.reply(
				`🧪 *${result.item.name}* habis.\nBeli: \`${m.prefix}beli ${m.args[0] || "potion"}\``
			);
			return;
		}

		if (result.status === "full") {
			await m.reply("✅ Status sudah penuh.");
			return;
		}

		await m.reply(formatUseItemResult(result));
	},
};
