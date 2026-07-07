import { GroupModel } from "#lib/database/index";
import {
	DEFAULT_WELCOME_TEMPLATE,
	GROUP_WELCOME_PAYLOAD_KEY,
	formatWelcomeMessage,
	formatWelcomeStatus,
	getGroupDescription,
	getGroupPayloads,
	getGroupSubject,
	normalizeWelcomeConfig,
} from "#lib/groupCommunity";

async function saveWelcomePayload(groupId, group, config) {
	await GroupModel.setGroup(groupId, {
		name: group?.name || group?.subject || "",
		payloads: {
			...getGroupPayloads(group),
			[GROUP_WELCOME_PAYLOAD_KEY]: normalizeWelcomeConfig(config),
		},
	});
}

function mustBeAdmin(action) {
	return ["on", "off", "set", "text", "template", "reset", "auto"].includes(
		action
	);
}

export default {
	name: "group-welcome",
	description: "Atur welcome kit otomatis untuk member baru grup.",
	command: ["welcome", "welcomekit", "sambut"],
	permissions: "all",
	category: "group",
	cooldown: 5,
	group: true,
	usage: "$prefix$command [on|off|set|preview|reset]",
	wait: null,
	react: true,

	async execute(m, { command, groupMetadata, isAdmin, isOwner }) {
		const group = await GroupModel.getGroup(m.from);
		const config = normalizeWelcomeConfig(
			getGroupPayloads(group)[GROUP_WELCOME_PAYLOAD_KEY]
		);
		const action = String(m.args[0] || "status")
			.toLowerCase()
			.trim();

		if (mustBeAdmin(action) && !isAdmin && !isOwner) {
			await m.reply("Welcome kit hanya bisa diatur admin grup.");
			return;
		}

		if (["status", "help", "bantuan", "info"].includes(action)) {
			await m.reply(formatWelcomeStatus(config, m.prefix));
			return;
		}

		if (action === "on") {
			const nextConfig = {
				...config,
				enabled: true,
				updatedAt: Date.now(),
			};

			await saveWelcomePayload(m.from, group, nextConfig);
			await m.reply(
				[
					"✅ *Welcome Kit Aktif*",
					"Bot akan menyambut member baru dengan template grup.",
					"",
					formatWelcomeStatus(nextConfig, m.prefix),
				].join("\n")
			);
			return;
		}

		if (action === "off") {
			const nextConfig = {
				...config,
				enabled: false,
				updatedAt: Date.now(),
			};

			await saveWelcomePayload(m.from, group, nextConfig);
			await m.reply("🛑 Welcome kit dimatikan.");
			return;
		}

		if (["set", "text", "template"].includes(action)) {
			const template = m.args.slice(1).join(" ").trim();

			if (!template) {
				await m.reply(
					`Isi template dulu. Contoh: ${m.prefix}${command} set Halo {mention}, selamat datang di {group}!`
				);
				return;
			}

			const nextConfig = {
				...config,
				template,
				updatedAt: Date.now(),
			};

			await saveWelcomePayload(m.from, group, nextConfig);
			await m.reply("✅ Template welcome diperbarui.");
			return;
		}

		if (["reset", "auto"].includes(action)) {
			const nextConfig = {
				...config,
				template: DEFAULT_WELCOME_TEMPLATE,
				updatedAt: Date.now(),
			};

			await saveWelcomePayload(m.from, group, nextConfig);
			await m.reply("✅ Template welcome dikembalikan ke smart default.");
			return;
		}

		if (["preview", "test", "tes"].includes(action)) {
			const preview = formatWelcomeMessage(config, {
				participantJid: m.senderPn || m.sender,
				groupName: getGroupSubject(groupMetadata, group.name),
				description: getGroupDescription(groupMetadata),
				prefix: m.prefix,
			});

			await m.reply(preview.text, {
				mentions: preview.mentions,
			});
			return;
		}

		await m.reply(formatWelcomeStatus(config, m.prefix));
	},
};
