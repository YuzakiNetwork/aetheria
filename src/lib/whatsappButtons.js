export async function sendCtaUrlButton(sock, m, payload, fallbackText) {
	if (!sock?.sendMessage) {
		await m.reply(fallbackText, { linkPreview: true });
		return;
	}

	try {
		await sock.sendMessage(
			m.from,
			{
				text: `*${payload.title}*\n${payload.body}`,
				footer: payload.footer,
				nativeFlow: [
					{
						text: payload.buttonText,
						url: payload.url,
						useWebview: true,
					},
				],
			},
			{
				quoted: m,
			}
		);
	} catch {
		await m.reply(fallbackText, { linkPreview: true });
	}
}
