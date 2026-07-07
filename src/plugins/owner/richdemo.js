import { BRAND_CONFIG } from "#config/brand";

const BAILEYS_COMPARE_URL =
	"https://github.com/itsliaaa/baileys/compare/587038cfa6ea43bb4e1b3597d180a1e3bc534aa7...836d0b3510a02b88e80667ce76fc1481d91aee2c";

function getHelp(prefix, command) {
	return [
		"*Aetheria Rich Response Lab*",
		"━━━━━━━━━━━━━━━━━━━━",
		`${prefix}${command}`,
		`${prefix}${command} latex`,
		`${prefix}${command} image`,
		"",
		"Command ini owner-only untuk mengetes rich response Baileys sebelum dipakai di fitur publik.",
	].join("\n");
}

function buildDefaultDemo(prefix) {
	return {
		disclaimerText: "Aetheria Rich Response Lab",
		headerText: "## Rich Response Demo",
		contentText:
			"Demo ini menggabungkan teks, code block, table, dan citation/link dalam satu pesan.",
		code: [
			"const update = {",
			'  feature: "rich-response",',
			'  command: "' + prefix + 'richdemo",',
			'  status: "testing"',
			"};",
			"console.log(update);",
		].join("\n"),
		language: "javascript",
		title: "Baileys Update Check",
		table: [
			["Area", "Status"],
			["WAProto", "2.3000.1040735178"],
			["Rich Response", "code/table/link"],
			["Aetheria", "demo ready"],
		],
		links: [
			{
				text: "Compare upstream Baileys",
				url: BAILEYS_COMPARE_URL,
				title: "itsliaaa/baileys compare",
				displayName: "GitHub",
				sources: [
					{
						displayName: "GitHub",
						subtitle: "Commit compare",
						url: BAILEYS_COMPARE_URL,
					},
				],
			},
		],
		footerText: `Coba juga ${prefix}richdemo latex atau ${prefix}richdemo image.`,
		fallbackText: [
			"Rich Response Demo",
			"Payload: text + code + table + link.",
			`Compare: ${BAILEYS_COMPARE_URL}`,
		].join("\n"),
	};
}

function buildLatexDemo(prefix) {
	return {
		disclaimerText: "Aetheria Rich Response Lab",
		richResponse: [
			{
				text: "## Rich Response LaTeX",
			},
			{
				text: "Mode ini mengetes metadata LaTeX dari update Baileys terbaru.",
			},
			{
				text: "Aetheria damage scaling:",
				latex: [
					{
						latexExpression:
							"D_{final}=D_{base}\\times(1+0.04\\times level)+crit",
						width: 680,
						height: 120,
						fontHeight: 34,
					},
				],
			},
			{
				text: `Kembali ke demo utama: ${prefix}richdemo`,
			},
		],
		fallbackText: [
			"Rich Response LaTeX",
			"D_final = D_base x (1 + 0.04 x level) + crit",
			`Kembali: ${prefix}richdemo`,
		].join("\n"),
	};
}

function buildImageDemo(prefix) {
	const imageUrl = "https://avatars.githubusercontent.com/u/88979678?v=4";

	return {
		disclaimerText: "Aetheria Rich Response Lab",
		richResponse: [
			{
				text: "## Rich Response Inline Image",
			},
			{
				text: "Mode ini mengetes submessage inlineImage. Jika client tidak merender image, fallback teks tetap harus terbaca.",
			},
			{
				inlineImage: {
					imagePreviewUrl: imageUrl,
					imageHighResUrl: imageUrl,
					sourceUrl: "https://github.com/itsliaaa/baileys",
				},
				imageText: "itsliaaa/baileys rich response image metadata",
				tapLinkUrl: "https://github.com/itsliaaa/baileys",
				alignment: 2,
			},
			{
				text: `Kembali ke demo utama: ${prefix}richdemo`,
			},
		],
		fallbackText: [
			"Rich Response Inline Image",
			"Jika gambar tidak tampil, berarti client WhatsApp belum merender metadata inline image.",
			`Kembali: ${prefix}richdemo`,
		].join("\n"),
	};
}

function resolveDemo(mode, prefix) {
	if (["latex", "math", "formula"].includes(mode)) {
		return buildLatexDemo(prefix);
	}

	if (["image", "img", "inline"].includes(mode)) {
		return buildImageDemo(prefix);
	}

	return buildDefaultDemo(prefix);
}

export default {
	name: "richdemo",
	description: "Tes rich response Baileys terbaru.",
	command: ["richdemo", "richresponse", "richresp"],
	category: "owner",
	owner: true,
	permissions: "owner",
	cooldown: 5,
	usage: "$prefix$command [latex|image]",
	wait: null,
	react: true,

	async execute(m, { command }) {
		const mode = String(m.args?.[0] || "")
			.toLowerCase()
			.trim();

		if (["help", "menu", "bantuan"].includes(mode)) {
			await m.reply(getHelp(m.prefix, command));
			return;
		}

		const demo = resolveDemo(mode, m.prefix);

		try {
			if (typeof m.replyRichResponse !== "function") {
				throw new Error("replyRichResponse helper belum tersedia.");
			}

			await m.replyRichResponse(demo, {
				fallbackText: demo.fallbackText,
			});
		} catch (error) {
			await m.reply(
				[
					"⚠️ *Rich response gagal dikirim*",
					demo.fallbackText,
					"",
					`Runtime: ${BRAND_CONFIG.name}`,
					`Error: ${error.message || error}`,
				].join("\n")
			);
		}
	},
};
