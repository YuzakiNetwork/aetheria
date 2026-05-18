import { BRAND_CONFIG } from "#config/brand";

const DIVIDER = "━━━━━━━━━━━━━━━━━━━━";
const CATEGORY_META = {
	akun: {
		icon: "🔐",
		label: "Akun",
	},
	convert: {
		icon: "🎨",
		label: "Convert",
	},
	downloader: {
		icon: "⬇️",
		label: "Downloader",
	},
	group: {
		icon: "👥",
		label: "Grup",
	},
	info: {
		icon: "ℹ️",
		label: "Info",
	},
	misc: {
		icon: "🧩",
		label: "Lainnya",
	},
	owner: {
		icon: "👑",
		label: "Owner",
	},
	petualangan: {
		icon: "⚔️",
		label: "Petualangan",
	},
	rpg: {
		icon: "⚔️",
		label: "Petualangan",
	},
	tools: {
		icon: "🛠️",
		label: "Tools",
	},
};

function getCategoryMeta(category = "general") {
	const key = String(category || "general")
		.toLowerCase()
		.trim();

	return (
		CATEGORY_META[key] || {
			icon: "📌",
			label: key.charAt(0).toUpperCase() + key.slice(1),
		}
	);
}

export default {
	name: "help",
	description: "Show help information",
	command: ["help", "menu"],
	permissions: "all",
	hidden: false,
	failed: "Failed to show %command: %error",
	category: "info",
	cooldown: 5,
	usage: "$prefix$command [command|category]",
	react: true,
	wait: null,

	execute: async (m, { plugins, isOwner }) => {
		const categories = new Map();

		const collator = new Intl.Collator("id", {
			sensitivity: "base",
			numeric: true,
		});

		for (const plugin of plugins) {
			if (plugin.hidden || (plugin.owner && !isOwner)) {
				continue;
			}
			const key = (plugin.category || "general").toLowerCase().trim();

			if (!categories.has(key)) {
				categories.set(key, []);
			}
			categories.get(key).push(plugin);
		}

		let response = "";

		if (m.args.length === 0) {
			response += `🌌 *${BRAND_CONFIG.name}*\n`;
			response += "_Command yang bisa dipakai_\n";
			response += `${DIVIDER}\n`;

			const sortedCategories = [...categories.entries()].sort(
				([a], [b]) => collator.compare(a, b)
			);

			for (const [category, cmds] of sortedCategories) {
				const categoryMeta = getCategoryMeta(category);

				response += `\n${categoryMeta.icon} *${categoryMeta.label}*\n`;

				const sortedCmds = [...cmds].sort((a, b) =>
					collator.compare(
						a?.command?.[0] || "",
						b?.command?.[0] || ""
					)
				);

				for (const cmd of sortedCmds) {
					response += `• \`${m.prefix}${cmd.command[0]}\` - ${cmd.description}\n`;
				}
			}

			response += `\n${DIVIDER}\n`;
			response += `Detail: \`${m.prefix}help [command/kategori]\``;
		} else {
			const query = m.args[0].toLowerCase();

			const plugin = plugins.find((p) =>
				p.command.some((cmd) => cmd.toLowerCase() === query)
			);

			if (plugin && !plugin.hidden && (!plugin.owner || isOwner)) {
				const meta = getCategoryMeta(plugin.category);

				response += `${meta.icon} *${plugin.name}*\n`;
				response += `_${plugin.description}_\n`;
				response += `${DIVIDER}\n`;
				response += `📌 Kategori: *${meta.label}*\n`;
				response += `🔁 Alias: \`${plugin.command.join(", ")}\`\n`;

				if (plugin.usage) {
					const usageLines = (
						Array.isArray(plugin.usage)
							? plugin.usage
							: String(plugin.usage).split("\n")
					)
						.flatMap((line) => String(line).split("\n"))
						.map((line) => line.trim())
						.filter(Boolean)
						.map((line) =>
							line
								.replace(/\$prefix/g, m.prefix)
								.replace(/\$command/g, plugin.command[0])
						);

					response += `\n🎮 *Cara Pakai*\n${usageLines
						.map((line) => `• \`${line}\``)
						.join("\n")}\n`;
				}
				if (plugin.cooldown > 0) {
					response += `⏳ Cooldown: *${plugin.cooldown}s*\n`;
				}
				if (plugin.limit) {
					response += `🎟️ Limit: *${plugin.limit}*\n`;
				}
				if (plugin.dailyLimit > 0) {
					response += `📅 Daily Limit: *${plugin.dailyLimit}*\n`;
				}
				if (plugin.permissions !== "all") {
					response += `🔐 Role: *${plugin.permissions}*\n`;
				}
				if (plugin.group) {
					response += "👥 Khusus grup\n";
				}
				if (plugin.private) {
					response += "📩 Khusus chat pribadi\n";
				}
				if (plugin.owner) {
					response += "👑 Khusus owner\n";
				}
				if (plugin.botAdmin) {
					response += "🛡️ Bot harus admin\n";
				}
				response += "\nGunakan sesuai cooldown.";
			} else if (categories.has(query)) {
				const categoryMeta = getCategoryMeta(query);

				const categoryPlugins = [...categories.get(query)].sort(
					(a, b) =>
						collator.compare(
							a?.command?.[0] || "",
							b?.command?.[0] || ""
						)
				);

				response += `${categoryMeta.icon} *${categoryMeta.label}*\n`;
				response += `${DIVIDER}\n`;
				for (const cmd of categoryPlugins) {
					const aliases =
						cmd.command.length > 1
							? ` _(alias: ${cmd.command.slice(1).join(", ")})_`
							: "";
					response += `• \`${m.prefix}${cmd.command[0]}\`${aliases}\n`;
					response += `  ${cmd.description}\n`;
				}
				response += `\nDetail: \`${m.prefix}help <command>\``;
			} else {
				response = [
					"❌ *Tidak ditemukan*",
					`${query} tidak ada.`,
					"",
					`Ketik: \`${m.prefix}help\``,
				].join("\n");
			}
		}

		await m.reply(response.trim());
	},
};
