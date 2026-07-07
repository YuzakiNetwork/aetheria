import Phaser from "phaser";
import { BootScene } from "./game/scenes/BootScene";
import { WorldScene } from "./game/scenes/WorldScene";
import { loadGameState, saveGameState } from "./game/simulation/state";
import { createHud } from "./game/ui/hud";
import { runtime } from "./runtime";
import "./styles.css";

const state = loadGameState();
const hud = createHud(state);

runtime.state = state;
runtime.hud = hud;
runtime.save = () => saveGameState(state);

const config = {
	type: Phaser.AUTO,
	parent: "game-root",
	width: 768,
	height: 576,
	backgroundColor: "#18251e",
	pixelArt: true,
	roundPixels: true,
	scale: {
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH,
		width: 768,
		height: 576,
	},
	scene: [BootScene, WorldScene],
};

new Phaser.Game(config);
hud.update();

let installPrompt = null;
const installButton = document.querySelector("#install-app");

window.addEventListener("beforeinstallprompt", (event) => {
	event.preventDefault();
	installPrompt = event;
	installButton.hidden = false;
});

installButton?.addEventListener("click", async () => {
	if (!installPrompt) {
		return;
	}

	await installPrompt.prompt();
	installPrompt = null;
	installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/sw.js").catch(() => {});
	});
}
