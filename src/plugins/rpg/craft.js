import {
	craftItem,
	formatCraftList,
	formatCraftResult,
	getPlayerId,
} from "#lib/rpg";

export default {
	name: "craft",
	description: "Buat item atau gear dari material.",
	command: ["craft", "crafting", "buat", "racik"],
	permissions: "all",
	category: "petualangan",
	cooldown: 5,
	usage: [
		"$prefix$command",
		"$prefix$command list",
		"$prefix$command <recipe>",
	],
	wait: null,

	async execute(m) {
		const recipeInput = m.args[0];

		if (
			!recipeInput ||
			["list", "daftar", "resep", "recipe"].includes(
				String(recipeInput).toLowerCase()
			)
		) {
			await m.reply(formatCraftList(m.prefix));
			return;
		}

		const result = await craftItem(getPlayerId(m), m.pushName, recipeInput);

		if (result.status === "missing") {
			await m.reply(
				[
					"🧭 *Belum Punya Karakter*",
					`Mulai dulu: \`${m.prefix}mulai warrior\``,
				].join("\n")
			);
			return;
		}

		if (result.status === "invalid_recipe") {
			await m.reply(`❌ Recipe tidak ada.\nCek: \`${m.prefix}craft\``);
			return;
		}

		if (result.status === "level_required") {
			await m.reply(
				`🔒 *${result.recipe.name}* butuh Lv ${result.requiredLevel}.\nLevel kamu: *${result.player.level}*`
			);
			return;
		}

		if (result.status === "not_enough_gold") {
			await m.reply(
				`💰 Gold kurang.\nButuh: *${result.total}*\nGold kamu: *${result.player.gold}*`
			);
			return;
		}

		if (result.status === "missing_materials") {
			const missing = result.missing
				.map(
					(item) => `📦 ${item.name}: *${item.owned}/${item.amount}*`
				)
				.join("\n");

			await m.reply(`📦 *Material Kurang*\n${missing}`);
			return;
		}

		await m.reply(formatCraftResult(result));
	},
};
