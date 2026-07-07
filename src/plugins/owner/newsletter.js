import { DEFAULT_NEWSLETTER_JID } from "#lib/updates";

function resolveNewsletterJid(value) {
	const text = String(value || "").trim();

	if (!text) {
		return DEFAULT_NEWSLETTER_JID;
	}

	if (text.endsWith("@newsletter")) {
		return text;
	}

	const digits = text.replace(/\D/g, "");

	return digits ? `${digits}@newsletter` : DEFAULT_NEWSLETTER_JID;
}

function formatObject(value) {
	const text = JSON.stringify(value ?? null, null, 2) ?? String(value);

	return text.slice(0, 3500);
}

function getHelp(prefix = ".", command = "newsletter") {
	return [
		"📣 *Newsletter Tools*",
		"━━━━━━━━━━━━━━━━━━━━",
		`${prefix}${command} info [jid]`,
		`${prefix}${command} subscribers [jid]`,
		`${prefix}${command} admincount [jid]`,
		`${prefix}${command} subscribed`,
		`${prefix}${command} react <jid> <message-id> <emoji>`,
		"",
		`Default: ${DEFAULT_NEWSLETTER_JID}`,
	].join("\n");
}

export default {
	name: "newsletter",
	description: "Inspect dan kelola fitur newsletter Baileys secara aman.",
	command: ["newsletter", "nletter", "channelinfo"],
	category: "owner",
	owner: true,
	permissions: "owner",
	cooldown: 5,
	usage: "$prefix$command [info|subscribers|admincount|subscribed|react]",
	wait: null,
	react: true,

	async execute(m, { command, sock }) {
		const action = String(m.args[0] || "info")
			.toLowerCase()
			.trim();

		if (["help", "bantuan"].includes(action)) {
			await m.reply(getHelp(m.prefix, command));
			return;
		}

		if (action === "subscribed") {
			if (typeof sock.newsletterSubscribed !== "function") {
				await m.reply(
					"newsletterSubscribed tidak tersedia di socket ini."
				);
				return;
			}

			const newsletters = await sock.newsletterSubscribed();
			await m.reply(
				[
					"📣 *Subscribed Newsletters*",
					"```json",
					formatObject(newsletters),
					"```",
				].join("\n")
			);
			return;
		}

		const jid = resolveNewsletterJid(m.args[1]);

		if (["info", "metadata", "meta"].includes(action)) {
			if (typeof sock.newsletterMetadata !== "function") {
				await m.reply(
					"newsletterMetadata tidak tersedia di socket ini."
				);
				return;
			}

			const metadata = await sock.newsletterMetadata(jid);
			await m.reply(
				[
					"📣 *Newsletter Metadata*",
					`JID: ${jid}`,
					"```json",
					formatObject(metadata),
					"```",
				].join("\n")
			);
			return;
		}

		if (["subscribers", "subs"].includes(action)) {
			if (typeof sock.newsletterSubscribers !== "function") {
				await m.reply(
					"newsletterSubscribers tidak tersedia di socket ini."
				);
				return;
			}

			const subscribers = await sock.newsletterSubscribers(jid);
			await m.reply(
				[
					"📣 *Newsletter Subscribers*",
					`JID: ${jid}`,
					"```json",
					formatObject(subscribers),
					"```",
				].join("\n")
			);
			return;
		}

		if (["admincount", "admins"].includes(action)) {
			if (typeof sock.newsletterAdminCount !== "function") {
				await m.reply(
					"newsletterAdminCount tidak tersedia di socket ini."
				);
				return;
			}

			const count = await sock.newsletterAdminCount(jid);
			await m.reply(`📣 Admin newsletter ${jid}: ${count}`);
			return;
		}

		if (["react", "reaction"].includes(action)) {
			const targetJid = resolveNewsletterJid(m.args[1]);
			const messageId = m.args[2];
			const emoji = m.args[3] || "💛";

			if (!messageId) {
				await m.reply(getHelp(m.prefix, command));
				return;
			}

			if (typeof sock.newsletterReactMessage !== "function") {
				await m.reply(
					"newsletterReactMessage tidak tersedia di socket ini."
				);
				return;
			}

			await sock.newsletterReactMessage(targetJid, messageId, emoji);
			await m.reply(
				`📣 React ${emoji} dikirim ke message ${messageId} di ${targetJid}.`
			);
			return;
		}

		await m.reply(getHelp(m.prefix, command));
	},
};
