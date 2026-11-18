import Phaser from 'phaser';
import { CombatScene, H, W, sceneReady } from './combatScene';
import { TownScene, townReady } from './townScene';
import { initTutorial } from './tutorial';
import { startUI, type Stage } from './ui';
import './style.css';

async function boot() {
  // Make sure the Thai font is ready before Phaser draws canvas text.
  try {
    await Promise.race([document.fonts.load('20px Kanit'), new Promise((r) => setTimeout(r, 1500))]);
  } catch {
    /* fall back to system font */
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'stage',
    width: W,
    height: H,
    backgroundColor: '#14181f',
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
    scene: [TownScene, CombatScene], // both start; the UI keeps one awake and sleeps the other
  });
  const [town, combat] = await Promise.all([townReady, sceneReady]);
  const stage: Stage = {
    town,
    combat,
    show(key) {
      const other = key === 'town' ? 'combat' : 'town';
      if (!game.scene.isSleeping(other)) game.scene.sleep(other);
      if (game.scene.isSleeping(key)) game.scene.wake(key);
    },
  };
  startUI(stage);
  initTutorial();
}

void boot();
