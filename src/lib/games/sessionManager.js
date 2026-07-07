const DEFAULT_TTL_MS = 3 * 60 * 60 * 1000;

export function createGameSessionStore({ ttlMs = DEFAULT_TTL_MS } = {}) {
	const sessions = new Map();

	function cleanup(now = Date.now()) {
		for (const [chatId, session] of sessions.entries()) {
			if (session?.endedAt) {
				sessions.delete(chatId);
				continue;
			}

			if (session?.updatedAt && now - session.updatedAt > ttlMs) {
				sessions.delete(chatId);
			}
		}
	}

	function get(chatId, now = Date.now()) {
		cleanup(now);
		return sessions.get(chatId) || null;
	}

	function set(chatId, session, now = Date.now()) {
		const nextSession = {
			...session,
			chatId,
			updatedAt: now,
		};

		sessions.set(chatId, nextSession);

		return nextSession;
	}

	function update(chatId, updater, now = Date.now()) {
		const session = get(chatId, now);
		const nextSession = updater(session);

		if (!nextSession) {
			sessions.delete(chatId);
			return null;
		}

		return set(chatId, nextSession, now);
	}

	function remove(chatId) {
		return sessions.delete(chatId);
	}

	function clear() {
		sessions.clear();
	}

	return {
		clear,
		cleanup,
		get,
		remove,
		set,
		update,
	};
}
