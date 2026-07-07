function parsePollText(text = "") {
	const parts = String(text || "")
		.split("|")
		.map((part) => part.trim())
		.filter(Boolean);

	if (parts.length < 3) {
		return null;
	}

	const title = parts[0];
	const values = [...new Set(parts.slice(1))].slice(0, 12);

	return values.length >= 2 ? { title, values } : null;
}

function getHelp(prefix = ".", command = "poll") {
	return [
		"📊 *Poll Aetheria*",
		"━━━━━━━━━━━━━━━━━━━━",
		`Format: ${prefix}${command} judul | opsi 1 | opsi 2`,
		"",
		"Contoh:",
		`${prefix}${command} Main apa malam ini? | Aetheria Land | Catur | Ular Tangga`,
	].join("\n");
}

export default {
	name: "poll",
	description: "Buat poll WhatsApp native untuk voting cepat.",
	command: ["poll", "voting", "vote"],
	permissions: "all",
	category: "community",
	cooldown: 15,
	usage: "$prefix$command <judul> | <opsi 1> | <opsi 2>",
	wait: null,
	react: true,

	async execute(m, { command }) {
		const parsed = parsePollText(m.text);

		if (!parsed) {
			await m.reply(getHelp(m.prefix, command));
			return;
		}

		await m.replyPoll(parsed.title, parsed.values, {
			canAddOption: false,
			hideVoter: false,
			selectableCount: 1,
		});
	},
};

export { parsePollText };
