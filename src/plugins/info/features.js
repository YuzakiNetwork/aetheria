import { BRAND_CONFIG } from "#config/brand";
import { buildCommandDiscoveryPayload } from "#lib/commandDiscovery";

export default {
	name: "features",
	description: "Cari dan jelajahi fitur Aetheria dengan ringkas.",
	command: ["fitur", "features", "cmd", "commands", "cari"],
	permissions: "all",
	category: "info",
	cooldown: 5,
	usage: [
		"$prefix$command",
		"$prefix$command rpg",
		"$prefix$command cari downloader",
		"$prefixcari daily",
	],
	wait: null,
	react: true,

	async execute(m, { plugins = [], isOwner = false }) {
		const query =
			m.command === "cari"
				? m.text
				: m.args[0] &&
					  ["cari", "search", "find"].includes(
							m.args[0].toLowerCase()
					  )
					? m.args.slice(1).join(" ")
					: m.text;
		const payload = buildCommandDiscoveryPayload({
			brand: BRAND_CONFIG,
			isOwner,
			plugins,
			prefix: m.prefix,
			query,
		});

		if (payload.sections?.length && typeof m.replyList === "function") {
			await m.replyList(payload.text, payload.sections, {
				buttonText: "Pilih Fitur",
				footer: BRAND_CONFIG.name,
				title: payload.title,
			});
			return;
		}

		await m.reply(payload.text);
	},
};
