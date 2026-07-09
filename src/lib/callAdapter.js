// CallAdapter — thin wrapper around baileys-caller's VoipClient.
//
// baileys-caller uses its own internal Baileys socket for signaling,
// so it needs a separate auth directory (authDir). This adapter:
//   - lazily imports baileys-caller (so the main bot doesn't pay the
//     WASM init cost unless a call command is actually issued)
//   - manages a singleton VoipClient per authDir
//   - exposes connect(), call(), disconnect(), and activeCall tracking
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

let _client = null;
let _identity = null;
let _connecting = null;
let _activeCall = null;
let _sharedSock = null;

/**
 * Register the bot's main Baileys socket so the VoIP caller can reuse
 * it for signaling. Called once after `connection.update === "open"`.
 *
 * @param {any} sock
 * @returns {void}
 */
export function setSharedSock(sock) {
	_sharedSock = sock;
}

/**
 * Get the currently registered shared socket, if any.
 * @returns {any | null}
 */
export function getSharedSock() {
	return _sharedSock;
}

/**
 * Default auth directory for the VoIP socket. Separate from the main
 * bot's auth_info_baileys/ so the two Baileys sockets don't clash.
 * @returns {string}
 */
export function defaultVoipAuthDir() {
	const dir = resolve(process.cwd(), "auth_info_voip");
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	return dir;
}

/**
 * Lazily create and connect a VoipClient singleton.
 *
 * Accepts either:
 *   - { sock }: existing connected Baileys socket (shares the bot's
 *     linked-device session — no separate QR pairing)
 *   - { authDir }: separate auth dir for the VoIP socket's own session
 *     (requires pairing a second linked device)
 *
 * @param {{ authDir?: string, sock?: any }} [opts]
 * @returns {Promise<import("baileys-caller").VoipClient>}
 */
export async function getVoipClient(opts = {}) {
	// Prefer the shared socket from the main bot unless the caller
	// explicitly asks for a separate authDir.
	const useSock = opts.sock || (opts.authDir ? null : _sharedSock);
	const identity = useSock
		? "shared-sock"
		: opts.authDir || defaultVoipAuthDir();

	if (_client && _identity === identity) {
		return _client;
	}

	if (_connecting) {
		return _connecting;
	}

	_connecting = (async () => {
		const { VoipClient } = await import("baileys-caller");
		const config = useSock
			? { sock: useSock }
			: { authDir: opts.authDir || defaultVoipAuthDir() };
		const client = new VoipClient(config);
		await client.connect();
		_client = client;
		_identity = identity;
		_connecting = null;
		return client;
	})();

	return _connecting;
}

/**
 * Place an outbound voice call to a phone number and stream audio.
 *
 * @param {string} phoneNumber Digits only, e.g. "628123456789".
 * @param {{ audioSource?: string, durationMs?: number, authDir?: string, sock?: any }} [opts]
 * @returns {Promise<import("baileys-caller").ActiveCall>}
 */
export async function placeCall(phoneNumber, opts = {}) {
	const client = await getVoipClient({
		authDir: opts.authDir,
		sock: opts.sock,
	});

	if (_activeCall) {
		throw new Error(
			"VoIP call already in progress. End the current call first."
		);
	}

	const call = await client.call(phoneNumber, {
		audioSource: opts.audioSource || "silence",
		durationMs: opts.durationMs,
	});

	_activeCall = call;

	call.on("ended", () => {
		_activeCall = null;
	});

	return call;
}

/**
 * Get the currently active call, if any.
 * @returns {import("baileys-caller").ActiveCall | null}
 */
export function getActiveCall() {
	return _activeCall;
}

/**
 * End the active call, if any.
 * @returns {void}
 */
export function endActiveCall() {
	if (_activeCall) {
		_activeCall.end();
		_activeCall = null;
	}
}

/**
 * Disconnect the VoIP client entirely (close the signaling socket).
 * @returns {void}
 */
export function disconnectVoip() {
	if (_client) {
		_client.disconnect();
	}
	_client = null;
	_identity = null;
	_activeCall = null;
}

/**
 * Normalize a phone-number-like string to digits only.
 * Strips @s.whatsapp.net suffix, + prefix, spaces, dashes.
 *
 * @param {string} input
 * @returns {string}
 */
export function normalizePhone(input) {
	return String(input || "")
		.replace(/@s\.whatsapp\.net$/i, "")
		.replace(/@lid$/i, "")
		.replace(/[^\d]/g, "");
}
