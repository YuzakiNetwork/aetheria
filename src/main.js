import { BRAND_CONFIG } from "#config/brand";
import Connect from "#core/connect";
import { autoLoadCloneBots } from "#lib/clonebot/load";
import { Colors, colorize } from "#lib/colors";
import print from "#lib/print";
import { startAccountLinkServer } from "#lib/supabase/linkServer";
import { startDiscordBot } from "#platforms/discord/client";

function centerText(text, width = 55) {
	const pad = Math.max(0, Math.floor((width - text.length) / 2));
	return " ".repeat(pad) + text;
}

function art() {
	return [
		colorize(Colors.FgWhite, centerText(BRAND_CONFIG.name)),
		colorize(
			Colors.FgWhite,
			"+====================================================+"
		),
		colorize(
			Colors.FgWhite,
			"|         ,-~~\\             ,-. <~)_   ,-==.     ;. .|"
		),
		colorize(
			Colors.FgWhite,
			"|          (   \\            | |  ( v~\\  (  (\\   ; |  |"
		),
		colorize(
			Colors.FgWhite,
			"|.-===-.,   |\\. \\   .-==-.  | '   \\_/'   |\\.\\\\  `.|  |"
		),
		colorize(
			Colors.FgWhite,
			"|\\.___.'   _]_]\\ \\ /______\\ |     /\\    _]_]\\ \\   |  |"
		),
		colorize(
			Colors.FgWhite,
			"+====================================================+"
		),
	].join("\n");
}

async function animateStartup() {
	const msg = `Starting ${BRAND_CONFIG.name}`;
	for (let i = 0; i < 3; i++) {
		process.stdout.write(
			`\r${colorize(Colors.FgYellow, msg + ".".repeat(i + 1) + "   ")}`
		);
		await new Promise((res) => setTimeout(res, 400));
	}
	process.stdout.write("\r" + " ".repeat(msg.length + 3) + "\r");
}

process.on("unhandledRejection", (reason) => {
	print.error(colorize(Colors.FgRed, "Unhandled promise rejection:"), reason);
});

const bot = new Connect();
let linkServer = null;
let discordBot = null;

try {
	console.log(art());
	await animateStartup();
	print.info("Bot started & periodic task scheduled!");

	linkServer = await startAccountLinkServer({
		getSock: () => bot.sock,
		getPluginManager: () => bot.pluginManager,
		sessionName: bot.sessionName,
	});
	await bot.start();
	discordBot = await startDiscordBot({
		getWhatsAppSock: () => bot.sock,
		pluginManager: bot.pluginManager,
	});
	await autoLoadCloneBots();

	process.once("SIGINT", async () => {
		print.debug(colorize(Colors.FgYellow, "🛑 Stopping bot..."));

		try {
			bot.pluginManager.scheduler.stopAll();
			await discordBot?.stop?.();
			bot.store?.stopSaving?.();
			linkServer?.close?.();

			print.debug(
				colorize(Colors.FgGreen, "✅ Bot stopped successfully")
			);
			process.exit(0);
		} catch (error) {
			print.error(colorize(Colors.FgRed, "Failed to stop bot:"), error);
			process.exit(1);
		}
	});
} catch (error) {
	print.error(colorize(Colors.FgRed, "Failed to start WhatsApp Bot:"), error);
	process.exit(1);
}
