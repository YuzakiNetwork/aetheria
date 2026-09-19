import BaronBaileys from "baileys";

/**
 * ESM compatibility layer for Baron Baileys v2.
 *
 * Baron Baileys is published as CommonJS, while Aetheria is ESM.
 * Keeping the interop here lets the rest of Aetheria keep the
 * familiar Baileys named-import style.
 */
const baileys = BaronBaileys;

export const Browsers = baileys.Browsers;
export const DisconnectReason = baileys.DisconnectReason;
export const fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
export const getAggregateVotesInPollMessage =
	baileys.getAggregateVotesInPollMessage;
export const makeCacheableSignalKeyStore =
	baileys.makeCacheableSignalKeyStore;
export const makeWASocket = baileys.makeWASocket;
export const proto = baileys.proto;

export const areJidsSameUser = baileys.areJidsSameUser;
export const chatModificationToAppPatch =
	baileys.chatModificationToAppPatch;
export const downloadMediaMessage = baileys.downloadMediaMessage;
export const extractMessageContent = baileys.extractMessageContent;
export const generateForwardMessageContent =
	baileys.generateForwardMessageContent;
export const generateWAMessage = baileys.generateWAMessage;
export const generateWAMessageContent = baileys.generateWAMessageContent;
export const generateWAMessageFromContent =
	baileys.generateWAMessageFromContent;
export const getContentType = baileys.getContentType;
export const jidDecode = baileys.jidDecode;
export const jidNormalizedUser = baileys.jidNormalizedUser;

export default baileys;
