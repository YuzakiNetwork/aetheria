import { buyShopItem, formatBuyResult, getPlayerId } from "#lib/rpg";
import { replyMissingCharacter, replyRpgActions } from "#lib/rpgUi";

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
			await replyRpgActions(
				m,
				`🛒 Contoh: \`${m.prefix}beli potion 2\``,
				"shop",
				{ footer: "Aetheria Shop" }
			);
			return;
		}

		const result = await buyShopItem(
			getPlayerId(m),
			m.pushName,
			itemInput,
			quantity
		);

		if (result.status === "missing") {
			await replyMissingCharacter(m);
			return;
		}

		if (result.status === "invalid_item") {
			await replyRpgActions(
				m,
				`❌ Item tidak ada.\nCek toko: \`${m.prefix}shop\``,
				"shop",
				{ footer: "Aetheria Shop" }
			);
			return;
		}

		if (result.status === "level_required") {
			await replyRpgActions(
				m,
				`🔒 *${result.item.name}* butuh Lv ${result.requiredLevel}.\nLevel kamu: *${result.player.level}*`,
				"adventure",
				{ footer: "Aetheria Shop" }
			);
			return;
		}

		if (result.status === "not_enough_gold") {
			await replyRpgActions(
				m,
				`💰 Gold kurang.\nHarga: *${result.total}*\nGold kamu: *${result.player.gold}*`,
				"work",
				{ footer: "Aetheria Shop" }
			);
			return;
		}

		await replyRpgActions(m, formatBuyResult(result), "inventory", {
			footer: "Aetheria Shop",
		});
	},
};
