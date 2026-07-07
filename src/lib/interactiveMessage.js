// Builders for interactive messages against the official WhiskeySockets/Baileys
// v7 WAProto shape. These are also compatible with the @itsliaaa/baileys fork
// used by Aetheria today (the InteractiveMessage / NativeFlowMessage proto
// definitions are identical between the two distributions).
//
// Each builder returns a top-level WAProto.Message instance, ready to be
// turned into a relayable WebMessageInfo via generateWAMessageFromContent
// from either Baileys build.
//
// Why this file exists: the previous itsliaaa-only `nativeFlow` and
// `interactive` sugar on sock.sendMessage was a fork patch that the official
// Baileys library does not ship. We replace those sugar shortcuts with
// proto builders so a future migration to baileys@7.0.0-rc13 does not
// regress replyButtons / replyInteractive / replyList behaviour.
import { WAProto } from "baileys";

function trim(value) {
	return typeof value === "string" ? value.trim() : "";
}

function buildHeader(headerText) {
	const text = trim(headerText);
	return text ? { title: text, subtitle: "", hasSubtitle: false } : null;
}

function buildFooter(footerText) {
	const text = trim(footerText);
	return text ? { text } : null;
}

function buildContextInfo(mentions, quoted) {
	const list = Array.isArray(mentions)
		? mentions.filter(Boolean).map(String)
		: [];
	const info = {};
	if (list.length) {
		info.mentionedJid = list;
	}
	if (quoted?.key?.id) {
		info.stanzaId = quoted.key.id;
		info.participant =
			quoted.participant || quoted.key.participant || undefined;
		if (info.participant && quoted.key?.remoteJid) {
			info.remoteJid = quoted.key.remoteJid;
		}
	}
	return Object.keys(info).length ? info : null;
}

function buildNativeFlowButton(normalized) {
	if (!normalized) {
		return null;
	}
	if (normalized.copy !== undefined) {
		return {
			name: "cta_copy",
			buttonParamsJson: JSON.stringify({
				display_text: normalized.text || "Salin",
				copy_code: String(normalized.copy),
			}),
		};
	}
	if (normalized.url !== undefined) {
		const params = {
			display_text: normalized.text || "Buka",
			url: String(normalized.url),
		};
		if (normalized.useWebview) {
			params.webview_presentation = "FULL";
			params.action = "url";
		}
		return {
			name: "cta_url",
			buttonParamsJson: JSON.stringify(params),
		};
	}
	if (normalized.call !== undefined) {
		return {
			name: "cta_call",
			buttonParamsJson: JSON.stringify({
				display_text: normalized.text || "Telepon",
				phone_number: String(normalized.call),
			}),
		};
	}
	if (normalized.sections) {
		const params = {
			display_text: normalized.text || "Pilih",
			sections: normalized.sections,
		};
		for (const key of [
			"button_title",
			"list_title",
			"bottom_sheet",
			"icon",
		]) {
			if (normalized[key] !== undefined) {
				params[key] = normalized[key];
			}
		}
		return {
			name: "cta_list",
			buttonParamsJson: JSON.stringify(params),
		};
	}
	if (normalized.name && normalized.paramsJson) {
		return {
			name: String(normalized.name),
			buttonParamsJson:
				typeof normalized.paramsJson === "string"
					? normalized.paramsJson
					: JSON.stringify(normalized.paramsJson),
		};
	}
	if (normalized.id !== undefined) {
		return {
			name: "quick_reply",
			buttonParamsJson: JSON.stringify({
				display_text: normalized.text || "Pilih",
				id: String(normalized.id),
			}),
		};
	}
	return null;
}

function buildNativeFlowMessage(normalizedButtons = []) {
	const buttons = normalizedButtons
		.map(buildNativeFlowButton)
		.filter(Boolean);

	if (!buttons.length) {
		return null;
	}

	return WAProto.Message.InteractiveMessage.NativeFlowMessage.create({
		buttons,
		messageParamsJson: "{}",
		messageVersion: 3,
	});
}

/**
 * Build a classic ButtonsMessage (up to 3 reply buttons). Compatible with
 * the official WhatsApp Web buttons renderer, which ignores the optional
 * `interactiveMessage` field for fallback clients.
 *
 * @param {string} text Body text.
 * @param {Array<{ text: string, id: string }>} buttons Up to 3 reply buttons.
 * @param {{ footer?: string, mentions?: string[] }} options Extra options.
 * @returns {import("@itsliaaa/baileys").proto.Message.IMessage | null}
 */
export function buildButtonsMessage(text, buttons = [], options = {}) {
	const bodyText = trim(text);
	const protoButtons = (Array.isArray(buttons) ? buttons : [])
		.slice(0, 3)
		.map((b) => ({
			buttonId: trim(b?.id),
			buttonText: { displayText: trim(b?.text) },
			type: 1,
		}))
		.filter((b) => b.buttonId && b.buttonText.displayText);

	if (!protoButtons.length) {
		return null;
	}

	const buttonsMessage = {
		contentText: bodyText,
		footerText: trim(options.footer) || undefined,
		headerType: 1,
		headerText: bodyText,
		buttons: protoButtons,
	};

	const contextInfo = buildContextInfo(options.mentions);
	if (contextInfo) {
		buttonsMessage.contextInfo = contextInfo;
	}

	return WAProto.Message.fromObject({ buttonsMessage });
}

/**
 * Build a native-flow InteractiveMessage with reply buttons/list sections.
 *
 * @param {string} text Body text.
 * @param {Array<object>} nativeFlow Normalized native flow buttons (each with
 *   `text` plus one of `id`/`copy`/`url`/`call`/`sections`/`name`+`paramsJson`).
 * @param {{ footer?: string, mentions?: string[], headerText?: string }} options
 * @returns {import("@itsliaaa/baileys").proto.Message.IMessage | null}
 */
export function buildInteractiveMessage(text, nativeFlow = [], options = {}) {
	const nativeFlowMessage = buildNativeFlowMessage(nativeFlow);
	if (!nativeFlowMessage) {
		return null;
	}

	const interactiveMessage = {
		body: { text: trim(text) },
		footer: buildFooter(options.footer),
		nativeFlowMessage,
	};

	const header = buildHeader(options.headerText);
	if (header) {
		interactiveMessage.header = {
			title: header.title,
			subtitle: header.subtitle,
			hasSubtitle: header.hasSubtitle,
		};
	}

	const contextInfo = buildContextInfo(options.mentions);
	if (contextInfo) {
		interactiveMessage.contextInfo = contextInfo;
	}

	return WAProto.Message.fromObject({
		interactiveMessage:
			WAProto.Message.InteractiveMessage.create(interactiveMessage),
	});
}

/**
 * Build a ListMessage for private chats. Groups keep the native-flow variant.
 *
 * @param {string} text Body text.
 * @param {Array<{title: string, rows: Array<{id: string, title: string, description?: string, header?: string}>}>} sections
 * @param {{ title?: string, buttonText?: string, footer?: string, mentions?: string[] }} options
 * @returns {import("@itsliaaa/baileys").proto.Message.IMessage | null}
 */
export function buildListMessage(text, sections = [], options = {}) {
	const list = (Array.isArray(sections) ? sections : [])
		.map((section) => ({
			title: trim(section?.title) || "Pilihan",
			rows: (Array.isArray(section?.rows) ? section.rows : [])
				.slice(0, 10)
				.map((row) => ({
					rowId: trim(row?.id || row?.rowId),
					title: trim(row?.title || row?.text),
					description: trim(row?.description),
				}))
				.filter((r) => r.rowId && r.title),
		}))
		.filter((s) => s.rows.length);

	if (!list.length) {
		return null;
	}

	const buttonText = trim(options.buttonText) || "Pilih";

	const listMessage = {
		title: trim(options.title) || trim(text),
		description: trim(text),
		buttonText,
		footerText: trim(options.footer) || undefined,
		sections: list,
		listType: 1,
	};

	const contextInfo = buildContextInfo(options.mentions);
	if (contextInfo) {
		listMessage.contextInfo = contextInfo;
	}

	return WAProto.Message.fromObject({ listMessage });
}

/**
 * Build a PollCreationMessage via the regular `poll` sugar. Kept as a
 * builder for parity with the other helpers even though it maps straight to
 * a content payload.
 *
 * @param {string} name Poll question.
 * @param {string[]} values Poll options (2..12).
 * @param {{ selectableCount?: number, toAnnouncementGroup?: boolean }} options
 */
export function buildPollContent(name, values = [], options = {}) {
	const seen = new Set();
	const normalizedValues = (Array.isArray(values) ? values : [])
		.map((v) => trim(String(v)))
		.filter((v) => v && !seen.has(v) && (seen.add(v), true))
		.slice(0, 12);

	if (!normalizedValues.length) {
		return null;
	}

	const requested = Number(options.selectableCount || 1);
	const poll = {
		name: trim(name),
		values: normalizedValues,
		selectableCount: Math.max(
			1,
			Math.min(requested, normalizedValues.length)
		),
	};

	if (typeof options.toAnnouncementGroup === "boolean") {
		poll.toAnnouncementGroup = options.toAnnouncementGroup;
	}
	return { poll };
}

export const _internal = {
	buildContextInfo,
	buildFooter,
	buildHeader,
	buildNativeFlowButton,
	buildNativeFlowMessage,
	trim,
};
