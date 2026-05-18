function parseListEnv(value) {
	if (!value) {
		return [];
	}

	if (value.includes("[")) {
		try {
			const parsed = JSON.parse(value.replace(/'/g, '"'));

			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}

	return value.split(",");
}

function normalizeOwnerJids(value) {
	return parseListEnv(value)
		.map((jid) => String(jid || "").replace(/\D/g, ""))
		.filter(Boolean);
}

/**
 * MySQL database configuration.
 * @type {object}
 */
export const MYSQL_CONFIG = {
	host: process.env.MYSQL_HOST,
	port: parseInt(process.env.MYSQL_PORT, 10),
	user: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_DATABASE,
	tableName: process.env.MYSQL_TABLE_NAME,
};

/**
 * General bot configuration.
 * @type {object}
 */
export const BOT_CONFIG = {
	sessionName: process.env.BOT_SESSION_NAME || "aetheria",
	prefixes: process.env.BOT_PREFIXES
		? process.env.BOT_PREFIXES.includes("[")
			? JSON.parse(process.env.BOT_PREFIXES.replace(/'/g, '"'))
			: process.env.BOT_PREFIXES.split(",")
					.map((p) => p.trim())
					.filter(Boolean)
		: ["!", ".", "/"],
	ownerJids: normalizeOwnerJids(process.env.OWNER_JIDS),
	allowExperimental: process.env.BOT_ALLOW_EXPERIMENTAL !== "false",
};

/**
 * MongoDB configuration.
 * @type {object}
 */
export const MONGO_CONFIG = {
	uri: process.env.MONGO_URI,
	USE_MONGO: process.env.USE_MONGO === "true",
	auth: process.env.MONGO_AUTH_COLLECTION,
};
