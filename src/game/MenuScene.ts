import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config';

export class MenuScene extends Phaser.Scene {
  private theme?: Phaser.Sound.BaseSound;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    // Key art, scaled to cover.
    const art = this.add.image(cx, GAME_HEIGHT / 2, 'splash-keyart');
    const cover = Math.max(
      GAME_WIDTH / art.width,
      GAME_HEIGHT / art.height
    );
    art.setScale(cover);

    // Darken slightly for text legibility.
    this.add
      .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0b16, 0.28)
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, GAME_HEIGHT - 150, 'PRESS  ENTER  TO  FIGHT', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#ffe24a',
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: prompt,
      alpha: 0.2,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    const controls = [
      'MOVE: Arrows / WASD     JUMP: Space',
      'PUNCH: J     HEAVY: K     KICK: L',
      'Chain punches into combos. Grab a dropped bat for extra reach.',
    ].join('\n');
    this.add
      .text(cx, GAME_HEIGHT - 70, controls, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#a99fc0',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    this.theme = this.sound.add('music-theme', { loop: true, volume: 0.4 });
    // Browsers block autoplay until a user gesture; start on key/tap.
    const start = () => {
      if (this.game.device.input.touch) {
        this.enterImmersive();
      }
      this.theme?.stop();
      this.sound.play('sfx-confirm');
      this.scene.start('GameScene');
    };
    this.input.keyboard?.once('keydown-ENTER', start);
    this.input.keyboard?.once('keydown-SPACE', start);
    // Tap to start (mobile / mouse).
    this.input.once('pointerdown', start);
  }

  /** Go fullscreen and lock to landscape (best-effort; needs a user gesture). */
  private enterImmersive(): void {
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    const lock = () => {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (o: string) => Promise<void>;
      };
      orientation?.lock?.('landscape').catch(() => {});
    };
    const req = el.requestFullscreen ?? el.webkitRequestFullscreen;
    if (req) {
      Promise.resolve(req.call(el))
        .then(lock)
        .catch(() => lock());
    } else {
      lock();
    }
  }
}
