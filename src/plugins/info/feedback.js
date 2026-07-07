import { BRAND_CONFIG } from "#config/brand";
import { BOT_CONFIG } from "#config/index";
import {
	formatFeedbackAck,
	formatFeedbackReport,
	trimFeedbackText,
} from "#lib/community";

function getOwnerTargets() {
	return BOT_CONFIG.ownerJids
		.map((jid) => String(jid || "").replace(/\D/g, ""))
		.filter(Boolean)
		.map((jid) => `${jid}@s.whatsapp.net`);
}

export default {
	name: "feedback",
	description: "Kirim feedback, saran, atau laporan bug ke owner Aetheria.",
	command: ["feedback", "bug", "saran", "suggest", "lapor"],
	permissions: "all",
	category: "community",
	cooldown: 60,
	dailyLimit: 5,
	usage: "$prefix$command <pesan>",
	wait: null,
	react: true,

	async execute(m, { command, groupMetadata, sock }) {
		const text = trimFeedbackText(m.text);

		if (!text) {
			await m.reply(
				`Kirim isi pesanmu.\nContoh: ${m.prefix}${command} tombol menu kadang tidak muncul`
			);
			return;
		}

		const ownerTargets = getOwnerTargets();

		if (!ownerTargets.length) {
			await m.reply(
				"Owner belum dikonfigurasi, feedback belum bisa dikirim."
			);
			return;
		}

		const report = formatFeedbackReport({
			chatJid: m.from,
			chatName: groupMetadata?.subject || m.chatName || "",
			command,
			isGroup: m.isGroup,
			senderJid: m.senderPn || m.sender,
			senderName: m.pushName,
			text,
		});
		const results = await Promise.allSettled(
			ownerTargets.map((target) =>
				sock.sendMessage(target, { text: report })
			)
		);
		const sentCount = results.filter(
			(result) => result.status === "fulfilled"
		).length;

		if (!sentCount) {
			await m.reply("Feedback gagal dikirim ke owner. Coba lagi nanti.");
			return;
		}

		const ack = formatFeedbackAck(command, sentCount);
		const buttons = [
			{
				text: "Status Bot",
				id: `${m.prefix}status`,
			},
			{
				text: "Menu",
				id: `${m.prefix}help`,
			},
		];

		if (typeof m.replyInteractive === "function") {
			await m.replyInteractive(ack, buttons, {
				footer: BRAND_CONFIG.name,
			});
			return;
		}

		if (typeof m.replyButtons === "function") {
			await m.replyButtons(ack, buttons, {
				footer: BRAND_CONFIG.name,
			});
			return;
		}

		await m.reply(ack);
	},
};
