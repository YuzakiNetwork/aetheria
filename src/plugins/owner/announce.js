import { BRAND_CONFIG } from "#config/brand";
import { getBotNumber } from "#lib/community";
import { normalizeJidTarget } from "#lib/jid";
import {
	DEFAULT_NEWSLETTER_JID,
	formatNewsletterAnnouncement,
} from "#lib/updates";

function getHelp(prefix, command) {
	return [
		"*Aetheria Announcement*",
		"━━━━━━━━━━━━━━━━━━━━",
		`${prefix}${command} preview`,
		`${prefix}${command} latest`,
		`${prefix}${command} latest <jid/nomor/idgrup>`,
		`${prefix}${command} <jid/nomor/idgrup> <pesan>`,
		"",
		`Default target: ${DEFAULT_NEWSLETTER_JID}`,
	].join("\n");
}

function parseCustomAnnouncement(text = "") {
	const match = /^(\S+)\s+([\s\S]+)$/i.exec(String(text || "").trim());

	if (!match) {
		return null;
	}

	return {
		target: normalizeJidTarget(match[1]),
		rawTarget: match[1],
		text: match[2].trim(),
	};
}

export default {
	name: "announce",
	description: "Preview atau kirim announcement update Aetheria.",
	command: ["announce", "pengumuman", "broadcastupdate"],
	category: "owner",
	owner: true,
	permissions: "owner",
	cooldown: 5,
	usage: "$prefix$command [preview|latest|target] [pesan]",
	wait: null,
	react: true,

	async execute(m, { args, command, sock }) {
		const mode = String(args[0] || "")
			.toLowerCase()
			.trim();
		const latestText = formatNewsletterAnnouncement({
			botNumber: getBotNumber(sock),
			prefix: m.prefix,
		});

		if (!mode) {
			await m.reply(getHelp(m.prefix, command));
			return;
		}

		if (["preview", "pratinjau"].includes(mode)) {
			await m.reply(latestText);
			return;
		}

		if (["latest", "terbaru", "news"].includes(mode)) {
			const target = normalizeJidTarget(
				args[1] || DEFAULT_NEWSLETTER_JID
			);

			if (!target) {
				await m.reply("Target announcement tidak valid.");
				return;
			}

			const sent = await sock.sendMessage(target, { text: latestText });
			await m.reply(
				[
					"✅ *Announcement terkirim*",
					`Target: ${target}`,
					`Message ID: ${sent?.key?.id || "-"}`,
				].join("\n")
			);
			return;
		}

		const custom = parseCustomAnnouncement(m.text);

		if (!custom?.target || !custom.text) {
			await m.reply(getHelp(m.prefix, command));
			return;
		}

		const sent = await sock.sendMessage(custom.target, {
			text: custom.text,
		});

		const buttons = [
			{
				text: "Preview Latest",
				id: `${m.prefix}${command} preview`,
			},
			{
				text: "Kirim Latest",
				id: `${m.prefix}${command} latest`,
			},
		];
		const response = [
			"✅ *Announcement terkirim*",
			`Target: ${custom.target}`,
			`Message ID: ${sent?.key?.id || "-"}`,
		].join("\n");

		if (typeof m.replyInteractive === "function") {
			await m.replyInteractive(response, buttons, {
				footer: BRAND_CONFIG.name,
			});
			return;
		}

		if (typeof m.replyButtons === "function") {
			await m.replyButtons(response, buttons, {
				footer: BRAND_CONFIG.name,
			});
			return;
		}

		await m.reply(response);
	},
};
