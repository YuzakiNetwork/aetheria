import { formatUseItemResult, getPlayerId, useConsumable } from "#lib/rpg";
import { replyMissingCharacter, replyRpgActions } from "#lib/rpgUi";

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
			await replyMissingCharacter(m);
			return;
		}

		if (result.status === "not_consumable") {
			await replyRpgActions(
				m,
				"❌ Item itu tidak bisa dipakai langsung.",
				"inventory",
				{ footer: "Aetheria Inventory" }
			);
			return;
		}

		if (result.status === "no_item") {
			await replyRpgActions(
				m,
				`🧪 *${result.item.name}* habis.\nBeli: \`${m.prefix}beli ${m.args[0] || "potion"}\``,
				"shop",
				{ footer: "Aetheria Shop" }
			);
			return;
		}

		if (result.status === "full") {
			await replyRpgActions(m, "✅ Status sudah penuh.", "adventure", {
				footer: "Aetheria Heal",
			});
			return;
		}

		await replyRpgActions(m, formatUseItemResult(result), "heal", {
			footer: "Aetheria Heal",
		});
	},
};
