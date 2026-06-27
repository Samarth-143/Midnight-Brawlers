import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './game/config';
import { BootScene } from './game/BootScene';
import { MenuScene } from './game/MenuScene';
import { GameScene } from './game/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0e0b16',
  pixelArt: false,
  roundPixels: true,
  scene: [BootScene, MenuScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
