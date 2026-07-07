const PIN_DURATIONS = new Map([
	["1d", 86_400],
	["1day", 86_400],
	["hari", 86_400],
	["7d", 604_800],
	["7day", 604_800],
	["minggu", 604_800],
	["30d", 2_592_000],
	["30day", 2_592_000],
	["bulan", 2_592_000],
]);

function getQuotedKey(m) {
	return m.quoted?.key?.id ? m.quoted.key : null;
}

function parseDuration(value = "1d") {
	const key = String(value || "1d")
		.toLowerCase()
		.trim();

	return PIN_DURATIONS.get(key) || PIN_DURATIONS.get("1d");
}

function help(prefix = ".", command = "pinmsg") {
	return [
		"📌 *Pin & Keep Message*",
		"━━━━━━━━━━━━━━━━━━━━",
		`Reply pesan lalu ketik: ${prefix}${command} 1d`,
		"Durasi pin: 1d, 7d, 30d",
		"",
		`Unpin: ${prefix}unpinmsg`,
		`Keep disappearing message: ${prefix}keep`,
		`Unkeep: ${prefix}unkeep`,
	].join("\n");
}

export default {
	name: "pin",
	description:
		"Pin, unpin, keep, atau unkeep pesan grup dengan fitur Baileys.",
	command: ["pinmsg", "unpinmsg", "keep", "unkeep"],
	permissions: "admin",
	category: "group",
	cooldown: 5,
	group: true,
	usage: "Reply pesan lalu $prefix$command [1d|7d|30d]",
	wait: null,
	react: true,

	async execute(m, { command, sock }) {
		const key = getQuotedKey(m);

		if (!key) {
			await m.reply(help(m.prefix, command));
			return;
		}

		const mode = String(command || "").toLowerCase();

		if (mode === "pinmsg" || mode === "unpinmsg") {
			const type = mode === "pinmsg" ? 1 : 2;
			const time = mode === "pinmsg" ? parseDuration(m.args[0]) : 0;

			await sock.sendMessage(
				m.from,
				{
					pin: key,
					time,
					type,
				},
				{ quoted: m }
			);
			await m.reply(
				mode === "pinmsg"
					? `📌 Pesan dipin selama ${m.args[0] || "1d"}.`
					: "📌 Pin pesan dilepas."
			);
			return;
		}

		await sock.sendMessage(
			m.from,
			{
				keep: key,
				type: mode === "keep" ? 1 : 2,
			},
			{ quoted: m }
		);
		await m.reply(
			mode === "keep"
				? "🔖 Pesan ditandai keep."
				: "🔖 Keep pesan dilepas."
		);
	},
};
