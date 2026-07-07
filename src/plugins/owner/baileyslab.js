import { buildWaMeLink, normalizeJidNumber } from "#lib/community";
import { Jimp, JimpMime, loadFont, rgbaToInt } from "jimp";
import { join } from "node:path";

const FONT_PATH = join(
	process.cwd(),
	"node_modules/@jimp/plugin-print/fonts/open-sans/open-sans-32-black/open-sans-32-black.fnt"
);

let fontPromise = null;

function getFont() {
	if (!fontPromise) {
		fontPromise = loadFont(FONT_PATH);
	}

	return fontPromise;
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createLabImage(label, color = rgbaToInt(236, 228, 208, 255)) {
	const font = await getFont();
	const image = new Jimp({ color, height: 420, width: 760 });

	image.scan(0, 0, 760, 72, (x, y) => {
		image.setPixelColor(rgbaToInt(46, 92, 82, 255), x, y);
	});
	image.print({
		font,
		maxHeight: 64,
		maxWidth: 680,
		text: "Aetheria Baileys Lab",
		x: 38,
		y: 116,
	});
	image.print({
		font,
		maxHeight: 80,
		maxWidth: 680,
		text: label,
		x: 38,
		y: 194,
	});

	return image.getBuffer(JimpMime.png);
}

function getHelp(prefix = ".", command = "baileyslab") {
	return [
		"🧪 *Baileys Lab*",
		"━━━━━━━━━━━━━━━━━━━━",
		`${prefix}${command} edit`,
		`${prefix}${command} ai`,
		`${prefix}${command} viewonce`,
		`${prefix}${command} spoiler`,
		`${prefix}${command} ephemeral`,
		`${prefix}${command} album`,
		`${prefix}${command} groupstatus`,
		`${prefix}${command} mentionall`,
		`${prefix}${command} contact`,
		`${prefix}${command} groupinvite`,
		`${prefix}${command} ad`,
		`${prefix}${command} label`,
		`${prefix}${command} jid <nomor/lid>`,
	].join("\n");
}

export default {
	name: "baileyslab",
	description: "Owner-only lab untuk mengetes fitur itsliaaa/baileys.",
	command: ["baileyslab", "walab", "baileys"],
	category: "owner",
	owner: true,
	permissions: "owner",
	cooldown: 5,
	usage: "$prefix$command [edit|ai|viewonce|spoiler|ephemeral|album|jid]",
	wait: null,
	react: true,

	async execute(m, { command, sock }) {
		const action = String(m.args[0] || "help")
			.toLowerCase()
			.trim();

		if (["help", "menu"].includes(action)) {
			await m.reply(getHelp(m.prefix, command));
			return;
		}

		if (action === "edit") {
			const sent = await sock.sendMessage(
				m.from,
				{ text: "🧪 Baileys edit test: preparing..." },
				{ quoted: m }
			);

			await sleep(900);
			await sock.sendMessage(m.from, {
				edit: sent.key,
				text: "✅ Baileys edit test: message edited successfully.",
			});
			return;
		}

		if (action === "ai") {
			await sock.sendMessage(
				m.from,
				{
					ai: true,
					text: "🤖 AI icon payload aktif untuk pesan ini.",
				},
				{ quoted: m }
			);
			return;
		}

		if (action === "viewonce") {
			await sock.sendMessage(
				m.from,
				{
					caption: "👁️ View once image dari Baileys Lab.",
					image: await createLabImage("View Once"),
					viewOnce: true,
				},
				{ quoted: m }
			);
			return;
		}

		if (action === "spoiler") {
			await sock.sendMessage(
				m.from,
				{
					caption: "📑 Spoiler image dari Baileys Lab.",
					image: await createLabImage(
						"Spoiler",
						rgbaToInt(232, 224, 246, 255)
					),
					spoiler: true,
				},
				{ quoted: m }
			);
			return;
		}

		if (action === "ephemeral") {
			await sock.sendMessage(
				m.from,
				{
					ephemeral: true,
					text: "🕒 Pesan ini dibungkus ephemeralMessage.",
				},
				{ quoted: m }
			);
			return;
		}

		if (action === "album") {
			await sock.sendMessage(
				m.from,
				{
					album: [
						{
							caption: "Aetheria Land visual",
							image: await createLabImage(
								"Album Card 1",
								rgbaToInt(228, 240, 224, 255)
							),
						},
						{
							caption: "Catur dan Ular Tangga visual",
							image: await createLabImage(
								"Album Card 2",
								rgbaToInt(224, 235, 247, 255)
							),
						},
					],
				},
				{ quoted: m }
			);
			return;
		}

		if (action === "groupstatus") {
			if (!m.isGroup) {
				await m.reply("groupStatus hanya cocok dicoba di grup.");
				return;
			}

			await sock.sendMessage(
				m.from,
				{
					caption: "👥 Group status payload dari Baileys Lab.",
					groupStatus: true,
					image: await createLabImage(
						"Group Status",
						rgbaToInt(232, 238, 222, 255)
					),
				},
				{ quoted: m }
			);
			return;
		}

		if (action === "mentionall") {
			if (!m.isGroup) {
				await m.reply("mentionAll hanya untuk grup.");
				return;
			}

			await sock.sendMessage(
				m.from,
				{
					mentionAll: true,
					text: "🧪 Native mentionAll test dari Baileys Lab.",
				},
				{ quoted: m }
			);
			return;
		}

		if (action === "contact") {
			const botNumber = normalizeJidNumber(
				sock.user?.id || sock.user?.jid
			);
			const vcard = [
				"BEGIN:VCARD",
				"VERSION:3.0",
				"FN:Aetheria Bot",
				"ORG:Aetheria;",
				`TEL;type=CELL;type=VOICE;waid=${botNumber}:+${botNumber}`,
				"END:VCARD",
			].join("\n");

			await sock.sendMessage(
				m.from,
				{
					contacts: {
						contacts: [{ vcard }],
						displayName: "Aetheria Bot",
					},
				},
				{ quoted: m }
			);
			return;
		}

		if (action === "groupinvite") {
			if (!m.isGroup) {
				await m.reply("groupInvite hanya bisa dibuat dari grup.");
				return;
			}

			const code = await sock.groupInviteCode(m.from);
			const subject = m.metadata?.subject || "Aetheria Group";

			await sock.sendMessage(
				m.from,
				{
					groupInvite: {
						inviteCode: code,
						inviteExpiration: Date.now() + 86_400_000,
						jid: m.from,
						subject,
						text: `Join ${subject}`,
					},
				},
				{ quoted: m }
			);
			return;
		}

		if (action === "ad") {
			await sock.sendMessage(
				m.from,
				{
					externalAdReply: {
						body: "Baileys externalAdReply payload",
						largeThumbnail: true,
						thumbnail: await createLabImage("External Ad"),
						title: "Aetheria",
						url: buildWaMeLink(
							normalizeJidNumber(sock.user?.id || sock.user?.jid),
							`${m.prefix}rpg`
						),
					},
					text: "📰 External ad reply test.",
				},
				{ quoted: m }
			);
			return;
		}

		if (["label", "secure", "securelabel"].includes(action)) {
			await sock.sendMessage(
				m.from,
				{
					secureMetaServiceLabel: true,
					text: "🏷️ Secure meta service label payload aktif.",
				},
				{ quoted: m }
			);
			return;
		}

		if (action === "jid") {
			const target = m.args[1] || m.mentions?.[0] || m.quoted?.sender;

			if (!target) {
				await m.reply(`${m.prefix}${command} jid <nomor/lid>`);
				return;
			}

			if (typeof sock.findUserId !== "function") {
				await m.reply("findUserId tidak tersedia di socket ini.");
				return;
			}

			const result = await sock.findUserId(target);
			await m.reply(
				[
					"🏷️ *Find User ID*",
					"```json",
					JSON.stringify(result, null, 2),
					"```",
				].join("\n")
			);
			return;
		}

		await m.reply(getHelp(m.prefix, command));
	},
};
