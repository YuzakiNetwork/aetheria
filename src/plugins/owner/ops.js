import { BRAND_CONFIG } from "#config/brand";
import { BOT_CONFIG } from "#config/index";
import { formatOwnerOps } from "#lib/community";
import { GroupModel, SettingsModel, UserModel } from "#lib/database/index";

function countByFlag(rows = [], key) {
	return rows.filter((row) => Boolean(row?.[key])).length;
}

export default {
	name: "ops",
	description: "Ringkasan operasional bot untuk owner.",
	command: ["ops", "botops", "operasi"],
	category: "owner",
	owner: true,
	permissions: "owner",
	cooldown: 5,
	usage: "$prefix$command",
	wait: null,
	react: true,

	async execute(m, { pluginManager, plugins }) {
		const [settings, users, groups] = await Promise.all([
			SettingsModel.getSettings(),
			UserModel.getAllUsers(),
			GroupModel.getAllGroups(),
		]);
		const text = formatOwnerOps({
			groupCount: groups.length,
			groupsBanned: countByFlag(groups, "banned"),
			memory: process.memoryUsage(),
			ownerCount: BOT_CONFIG.ownerJids.length,
			plugins,
			queueStatus: pluginManager?.getQueueStatus?.() || {},
			settings,
			uptimeMs: process.uptime() * 1000,
			userCount: users.length,
			usersBanned: countByFlag(users, "banned"),
			usersPremium: countByFlag(users, "premium"),
		});
		const buttons = [
			{
				text: "Mode",
				id: `${m.prefix}mode`,
			},
			{
				text: "Queue",
				id: `${m.prefix}commandqueue`,
			},
			{
				text: "Owner Help",
				id: `${m.prefix}help owner`,
			},
		];

		if (typeof m.replyInteractive === "function") {
			await m.replyInteractive(text, buttons, {
				footer: BRAND_CONFIG.name,
			});
			return;
		}

		if (typeof m.replyButtons === "function") {
			await m.replyButtons(text, buttons, {
				footer: BRAND_CONFIG.name,
			});
			return;
		}

		await m.reply(text);
	},
};
