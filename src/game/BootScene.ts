import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config';
import {
  CHARACTER_SHEETS,
  FX_SHEETS,
  IMAGES,
  AUDIO,
  SheetDef,
} from './manifest';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x0e0b16);
    const status = this.add
      .text(cx, cy - 26, 'LOADING', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ff5ca8',
      })
      .setOrigin(0.5);

    this.add.rectangle(cx, cy + 10, 360, 14, 0x2a2440).setOrigin(0.5);
    const fill = this.add
      .rectangle(cx - 180, cy + 10, 0, 14, 0xff5ca8)
      .setOrigin(0, 0.5);

    this.load.on('progress', (v: number) => {
      fill.width = 360 * v;
    });
    this.load.on('complete', () => {
      status.setText('READY');
    });

    for (const s of [...CHARACTER_SHEETS, ...FX_SHEETS]) {
      this.load.spritesheet(s.key, s.url, {
        frameWidth: s.frameWidth,
        frameHeight: s.frameHeight,
      });
    }
    for (const img of IMAGES) {
      this.load.image(img.key, img.url);
    }
    for (const a of AUDIO) {
      this.load.audio(a.key, a.url);
    }
    // Level layout + prop atlas slicing data.
    this.load.json('level-stage-1', '/assets/levels/brawler-stage-1.json');
    this.load.json('props-manifest', '/assets/stage/props/street-props.manifest.json');
    this.load.json('hud-atlas-data', '/assets/ui/hud-atlas.json');
  }

  create(): void {
    for (const s of [...CHARACTER_SHEETS, ...FX_SHEETS]) {
      this.registerAnim(s);
    }
    this.scene.start('MenuScene');
  }

  private registerAnim(s: SheetDef): void {
    if (this.anims.exists(s.key)) {
      return;
    }
    this.anims.create({
      key: s.key,
      frames: this.anims.generateFrameNumbers(s.key, {
        start: 0,
        end: s.frames - 1,
      }),
      frameRate: s.fps,
      repeat: s.repeat,
    });
  }
}
