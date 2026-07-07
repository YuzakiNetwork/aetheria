export default {
	name: "voterpg",
	description: "Buat poll sederhana untuk voting arah fitur RPG.",
	command: ["voterpg", "pollrpg", "votefitur"],
	permissions: "all",
	category: "petualangan",
	cooldown: 60,
	wait: null,

	async execute(m) {
		const title =
			m.text ||
			"Aetheria RPG: fitur mana yang paling kamu tunggu berikutnya?";
		const values = [
			"Dungeon squad",
			"Raid boss besar",
			"Marketplace player",
			"Quest cerita",
		];

		if (typeof m.replyPoll === "function") {
			await m.replyPoll(title, values, {
				canAddOption: false,
				endDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
				hideVoter: false,
				selectableCount: 1,
			});
			return;
		}

		await m.reply(
			[
				`📊 *${title}*`,
				"",
				...values.map((value, index) => `${index + 1}. ${value}`),
			].join("\n")
		);
	},
};
