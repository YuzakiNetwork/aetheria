import { formatSellResult, getPlayerId, sellItem } from "#lib/rpg";

export default {
	name: "jual",
	description: "Jual material atau consumable untuk gold.",
	command: ["jual", "sell"],
	permissions: "all",
	category: "petualangan",
	cooldown: 5,
	usage: "$prefix$command <item|semua> [jumlah|all]",
	wait: null,

	async execute(m) {
		const itemInput = m.args[0];
		const quantity = m.args[1] || 1;

		if (!itemInput) {
			await m.reply(
				[
					"💰 *Jual Item*",
					`Contoh: \`${m.prefix}jual ore 3\``,
					`Jual semua: \`${m.prefix}jual semua\``,
				].join("\n")
			);
			return;
		}

		const result = await sellItem(
			getPlayerId(m),
			m.pushName,
			itemInput,
			quantity
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

		if (result.status === "not_sellable") {
			await m.reply("❌ Item itu tidak bisa dijual.");
			return;
		}

		if (result.status === "no_sellable_items") {
			await m.reply("📦 Tidak ada item yang bisa dijual.");
			return;
		}

		if (result.status === "no_item") {
			await m.reply(`📦 *${result.itemName}* tidak ada di inventory.`);
			return;
		}

		await m.reply(formatSellResult(result));
	},
};
