// Pure helpers that turn native-flow button / section shapes into a
// plain-text rendering. Plugins still construct `m.replyInteractive`
// or `m.replyList` with their button / section payloads, but on the
// official Baileys build those payloads are no longer transmitted as
// interactive components (the serializer parked them as text-only).
//
// `appendInteractiveSuffix` is the one-stop helper: pass the body text
// and the same payload you'd hand to `m.replyInteractive` /
// `m.replyList`, and you get back the user-visible string. Callers
// forward that to `m.reply(text, options)`, e.g.
//
//   await m.reply(
//     appendInteractiveSuffix("Pilih menu.", { sections }),
//     options,
//   );
//
// The shape mirrors what the plugins have always passed:
//
//   buttons : Array<{ text, id?, copy?, url?, call? }>
//   sections : Array<{ title, rows: Array<{ id, title, description? }> }>
//
// Anything we do not understand is skipped on purpose: the goal here
// is to surface the intent ("here are the choices you can react to")
// so the user can still copy a button id back without needing real
// native flow.

const FOOTER_HINT = "\n\nBalas dengan kode di belakang ◀ untuk memilih.";

function trim(value) {
	return typeof value === "string" ? value.trim() : "";
}

function renderButton(button, index) {
	if (!button || typeof button !== "object") {
		return null;
	}
	const text = trim(button.text) || trim(button.displayText);
	if (!text) {
		return null;
	}
	const id = trim(button.id) || trim(button.buttonId);
	const label = id
		? `${index + 1}. ${text} — \`${id}\``
		: `${index + 1}. ${text}`;
	return label;
}

function renderRow(row, index) {
	if (!row || typeof row !== "object") {
		return null;
	}
	const title = trim(row.title) || trim(row.text);
	const id = trim(row.id) || trim(row.rowId);
	if (!title && !id) {
		return null;
	}
	if (id && title) {
		return `${index + 1}. ${title} — \`${id}\``;
	}
	if (title) {
		return `${index + 1}. ${title}`;
	}
	return `${index + 1}. kode: \`${id}\``;
}

/**
 * Format an array of native-flow button payload as a numbered list.
 *
 * @param {Array<object>} buttons Raw button payloads.
 * @returns {string} Newline-separated bullet list, or empty string when
 *   no button survived sanitisation.
 */
export function formatButtonsAsText(buttons = []) {
	if (!Array.isArray(buttons) || buttons.length === 0) {
		return "";
	}
	const lines = [];
	buttons.forEach((button, index) => {
		const line = renderButton(button, index);
		if (line) {
			lines.push(line);
		}
	});
	return lines.join("\n");
}

/**
 * Format an array of list / native-flow sections as a numbered menu.
 *
 * @param {Array<object>} sections Raw section payloads.
 * @returns {string} Newline-separated menu, or empty string when no rows
 *   survived sanitisation.
 */
export function formatSectionsAsText(sections = []) {
	if (!Array.isArray(sections) || sections.length === 0) {
		return "";
	}
	const blocks = [];
	for (const section of sections) {
		if (!section || typeof section !== "object") {
			continue;
		}
		const title = trim(section.title) || "Pilihan";
		const rows = Array.isArray(section.rows) ? section.rows : [];
		const lines = rows
			.map((row, index) => renderRow(row, index))
			.filter(Boolean);
		if (lines.length === 0) {
			continue;
		}
		blocks.push(`*${title}*\n${lines.join("\n")}`);
	}
	return blocks.join("\n\n");
}

/**
 * Append a plain-text rendering of buttons / sections to `text`. The
 * suffixes render only when a payload survives normalisation, so a
 * caller passing `{}` simply gets back `text` with no decoration.
 *
 * @param {string} text Reply body.
 * @param {{ buttons?: Array<object>, sections?: Array<object> }} options
 *   Button or section payload to render.
 * @param {{ hint?: boolean, separator?: string }} [presentation={}]
 *   Optional presentation control. `hint: false` suppresses the
 *   footer copy hint, `separator` overrides the in-body separator.
 * @returns {string} Body with appended list (or unchanged when empty).
 */
export function appendInteractiveSuffix(text, options = {}, presentation = {}) {
	const body = trim(text);
	const buttons = formatButtonsAsText(options?.buttons);
	const sections = formatSectionsAsText(options?.sections);
	const blurbs = [buttons, sections].filter(Boolean);
	if (blurbs.length === 0) {
		return body;
	}
	const separator = presentation?.separator || "\n\n";
	const hint = presentation?.hint === false ? "" : FOOTER_HINT;
	const tail = blurbs.join("\n\n");
	if (!body) {
		return tail + hint;
	}
	if (!tail) {
		return body;
	}
	return body + separator + tail + hint;
}

export const _internal = {
	FOOTER_HINT,
	renderButton,
	renderRow,
	trim,
};
