import { getPlayerId } from "#lib/rpg";
import {
	formatGrantResult,
	formatRevokeResult,
	grantPremiumEntitlement,
	normalizePremiumType,
	revokePremiumEntitlement,
} from "#lib/supabase/monetization";

function resolveTargetJid(m, rawTarget = "") {
	const candidate =
		m?.quoted?.senderPn ||
		m?.quoted?.sender ||
		m?.mentions?.[0] ||
		rawTarget ||
		"";
	const digits = String(candidate).replace(/\D/g, "");

	return digits ? `${digits}@s.whatsapp.net` : "";
}

function parseGrantArgs(args = []) {
	const type = args[0] || "";
	const maybeDays = Number(args[1]);
	const hasDays = Number.isFinite(maybeDays) && maybeDays > 0;

	return {
		type,
		days: hasDays ? maybeDays : 30,
		target: hasDays ? args[2] : args[1],
		note: args.slice(hasDays ? 3 : 2).join(" "),
	};
}

export default {
	name: "premium-owner",
	description: "Grant atau cabut Supporter dan Aether Pass.",
	command: ["grantpremium", "addpremium", "revokepremium", "delpremium"],
	permissions: "owner",
	category: "owner",
	owner: true,
	cooldown: 3,
	usage: [
		"$prefix$command supporter 30 <nomor>",
		"$prefix$command pass 30 <nomor>",
		"$prefixrevokepremium supporter <nomor>",
		"$prefixrevokepremium pass <nomor>",
	],
	wait: null,

	async execute(m) {
		const isRevoke = ["revokepremium", "delpremium"].includes(m.command);

		if (isRevoke) {
			const type = m.args[0] || "";
			const target = resolveTargetJid(m, m.args[1]);

			if (!normalizePremiumType(type) || !target) {
				await m.reply(
					[
						"💎 *Premium Owner*",
						`Cabut: \`${m.prefix}revokepremium supporter 628xxx\``,
						`Cabut pass: \`${m.prefix}revokepremium pass 628xxx\``,
					].join("\n")
				);
				return;
			}

			const result = await revokePremiumEntitlement({
				whatsappJid: target,
				type,
				grantedBy: getPlayerId(m),
				note: m.args.slice(2).join(" "),
			});

			if (result.status !== "ok") {
				await m.reply(
					`Gagal cabut premium: ${result.error?.message || result.status}`
				);
				return;
			}

			await m.reply(formatRevokeResult(result));
			return;
		}

		const parsed = parseGrantArgs(m.args);
		const target = resolveTargetJid(m, parsed.target);

		if (!normalizePremiumType(parsed.type) || !target) {
			await m.reply(
				[
					"💎 *Premium Owner*",
					`Grant supporter: \`${m.prefix}grantpremium supporter 30 628xxx\``,
					`Grant pass: \`${m.prefix}grantpremium pass 30 628xxx\``,
					"",
					"Jika reply pesan user, nomor boleh dikosongkan.",
				].join("\n")
			);
			return;
		}

		const result = await grantPremiumEntitlement({
			whatsappJid: target,
			type: parsed.type,
			days: parsed.days,
			grantedBy: getPlayerId(m),
			note: parsed.note,
		});

		if (result.status !== "ok") {
			await m.reply(
				`Gagal grant premium: ${result.error?.message || result.status}`
			);
			return;
		}

		await m.reply(formatGrantResult(result));
	},
};
