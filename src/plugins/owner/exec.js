import { exec } from "child_process";

export default {
	name: "exec",
	description: "Execute JavaScript code.",
	command: ["$", "exec"],
	permissions: "owner",
	hidden: false,
	failed: "Failed to execute %command: %error",
	category: "owner",
	cooldown: 0,
	usage: "$command <text>",
	react: true,
	owner: true,
	wait: null,

	/**
	 * Executes the provided JavaScript code.
	 * @param {object} context - The context object.
	 * @param {import('baron-baileys-v2').WASocket} context.sock - The Baileys socket object.
	 * @param {object} context.m - The serialized message object.
	 */
	async execute(m, { isOwner, text }) {
		if (!isOwner) {
			await m.reply("🔒 This command is for owners only.");
			return;
		}
		if (!text) {
			await m.reply("📚 Usage:\n`$` text`\nExample: `$ ls`");
			return;
		}

		try {
			const result = await new Promise((resolve, reject) => {
				exec(text, (error, stdout, stderr) => {
					if (error) {
						reject(error);
					} else {
						resolve(stdout || stderr);
					}
				});
			});
			await m.reply(`${result}`.trim() || "undefined");
		} catch (error) {
			await m.reply(`${error}`.trim() || "undefined");
		}
	},
};
