const GROUP_SUFFIX = "@g.us";
const USER_SUFFIX = "@s.whatsapp.net";
const GROUP_PREFIX = "120363";

function cleanTargetPrefix(target) {
	return String(target || "")
		.trim()
		.replace(/^group:/i, "g:")
		.replace(/^user:/i, "u:");
}

function ensureSuffix(value, suffix) {
	const target = String(value || "").trim();

	if (!target) {
		return null;
	}

	return target.endsWith(suffix) ? target : `${target}${suffix}`;
}

function isLikelyGroupDigits(digits) {
	return digits.startsWith(GROUP_PREFIX);
}

export function normalizeJidTarget(input) {
	const raw = cleanTargetPrefix(input);

	if (!raw) {
		return null;
	}

	if (raw.includes("@")) {
		return raw;
	}

	if (/^g:/i.test(raw)) {
		return ensureSuffix(raw.slice(2), GROUP_SUFFIX);
	}

	if (/^u:/i.test(raw)) {
		const digits = raw.slice(2).replace(/\D/g, "");

		return digits ? ensureSuffix(digits, USER_SUFFIX) : null;
	}

	if (/^\+?\d+$/.test(raw)) {
		const digits = raw.replace(/\D/g, "");
		const suffix = isLikelyGroupDigits(digits) ? GROUP_SUFFIX : USER_SUFFIX;

		return ensureSuffix(digits, suffix);
	}

	if (/^[\d-]+$/.test(raw)) {
		return ensureSuffix(raw, GROUP_SUFFIX);
	}

	return null;
}
