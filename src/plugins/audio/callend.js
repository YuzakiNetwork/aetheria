// .callend — end the current VoIP call if any.
import { endActiveCall, getActiveCall } from "#lib/callAdapter";

export default {
	name: "callend",
	command: ["callend", "stopcall"],
	hidden: false,
	description: "Tutup voice call WhatsApp yang sedang berjalan.",
	usage: ".callend",
	execute: async (m) => {
		const active = getActiveCall();
		if (!active) {
			return m.reply("Tidak ada call berlangsung.");
		}
		endActiveCall();
		return m.reply("📴 Call ditutup.");
	},
};
