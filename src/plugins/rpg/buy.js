import { buyShopItem, formatBuyResult, getPlayerId } from "#lib/rpg";

export default {
	name: "beli",
	description: "Beli consumable atau gear.",
	command: ["beli", "buy"],
	permissions: "all",
	category: "petualangan",
	cooldown: 5,
	usage: "$prefix$command <item> [jumlah]",
	wait: null,

	async execute(m) {
		const itemInput = m.args[0];
		const quantity = m.args[1] || 1;

		if (!itemInput) {
			await m.reply(`🛒 Contoh: \`${m.prefix}beli potion 2\``);
			return;
		}

		const result = await buyShopItem(
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

		if (result.status === "invalid_item") {
			await m.reply(`❌ Item tidak ada.\nCek toko: \`${m.prefix}shop\``);
			return;
		}

		if (result.status === "level_required") {
			await m.reply(
				`🔒 *${result.item.name}* butuh Lv ${result.requiredLevel}.\nLevel kamu: *${result.player.level}*`
			);
			return;
		}

		if (result.status === "not_enough_gold") {
			await m.reply(
				`💰 Gold kurang.\nHarga: *${result.total}*\nGold kamu: *${result.player.gold}*`
			);
			return;
		}

		await m.reply(formatBuyResult(result));
	},
};
