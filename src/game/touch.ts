import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, Phaserish } from './config';
import { Controls } from './input';

const DEPTH = 9000;

interface ButtonSpec {
  x: number;
  y: number;
  r: number;
  label: string;
  color: number;
  press: () => void;
}

/**
 * On-screen controls for touch devices: a glossy analog stick on the left and
 * a neon action cluster on the right, plus a pause button. Writes directly into
 * the shared Controls instance so the Hero reads one unified input source.
 */
export class TouchControls {
  private scene: Phaser.Scene;
  private controls: Controls;

  private baseX = 120;
  private baseY = GAME_HEIGHT - 116;
  private radius = 64;
  private stickPointerId = -1;
  private thumb!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, controls: Controls) {
    this.scene = scene;
    this.controls = controls;

    // Allow several simultaneous touches (stick + buttons).
    scene.input.addPointer(2);

    this.buildStick();
    this.buildButtons();
    this.buildPauseButton();
    this.wireStick();
  }

  private buildStick(): void {
    const { baseX: x, baseY: y, radius: r } = this;
    // Soft halo.
    this.scene.add
      .circle(x, y, r + 12, 0x46e0ff, 0.06)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setBlendMode(Phaser.BlendModes.ADD);
    // Base ring.
    this.scene.add
      .circle(x, y, r, 0x0e0b16, 0.32)
      .setStrokeStyle(3, 0x46e0ff, 0.55)
      .setScrollFactor(0)
      .setDepth(DEPTH);
    this.scene.add
      .text(x, y + r + 14, 'MOVE', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#7f8aa6',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH);

    // Glossy thumb (outer + inner highlight) in a container we can move.
    const thumbBody = this.scene.add
      .circle(0, 0, 30, 0xff5ca8, 0.75)
      .setStrokeStyle(2, 0xffffff, 0.6);
    const gloss = this.scene.add.circle(0, -8, 12, 0xffffff, 0.28);
    this.thumb = this.scene.add
      .container(x, y, [thumbBody, gloss])
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);
  }

  private makeButton(spec: ButtonSpec): void {
    const { x, y, r, label, color } = spec;
    const glow = this.scene.add
      .circle(x, y, r + 7, color, 0.16)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setBlendMode(Phaser.BlendModes.ADD);
    const body = this.scene.add
      .circle(x, y, r, 0x0e0b16, 0.4)
      .setStrokeStyle(3, color, 0.85)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setInteractive({ useHandCursor: true });
    const text = this.scene.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.round(r * 0.42)}px`,
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 2);

    body.on('pointerdown', () => {
      spec.press();
      glow.setAlpha(0.4);
      this.scene.tweens.add({
        targets: [body, text],
        scale: 0.86,
        duration: 70,
        yoyo: true,
      });
      this.scene.tweens.add({
        targets: glow,
        alpha: 0.16,
        duration: 220,
      });
    });
  }

  private buildButtons(): void {
    const bx = GAME_WIDTH - 96;
    const by = GAME_HEIGHT - 92;
    const specs: ButtonSpec[] = [
      { x: bx, y: by, r: 42, label: 'PUNCH', color: 0xff5ca8, press: () => this.controls.pressPulse('light') },
      { x: bx - 92, y: by - 8, r: 34, label: 'KICK', color: 0x46e0ff, press: () => this.controls.pressPulse('kick') },
      { x: bx - 58, y: by - 88, r: 32, label: 'JUMP', color: 0x49e08a, press: () => this.controls.pressPulse('jump') },
      { x: bx + 20, y: by - 80, r: 30, label: 'HVY', color: 0xffd23f, press: () => this.controls.pressPulse('heavy') },
    ];
    for (const s of specs) {
      this.makeButton(s);
    }
  }

  private buildPauseButton(): void {
    const x = GAME_WIDTH / 2;
    const y = 28;
    const body = this.scene.add
      .circle(x, y, 20, 0x0e0b16, 0.4)
      .setStrokeStyle(2, 0xffffff, 0.45)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setInteractive({ useHandCursor: true });
    this.scene.add
      .text(x, y, '❚❚', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#ede9f4',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 2);
    body.on('pointerdown', () => this.controls.pressPulse('pause'));
  }

  private wireStick(): void {
    const update = (p: Phaser.Input.Pointer) => {
      const dx = Phaserish.clamp(p.x - this.baseX, -this.radius, this.radius);
      const dy = Phaserish.clamp(p.y - this.baseY, -this.radius, this.radius);
      const nx = dx / this.radius;
      const ny = dy / this.radius;
      this.controls.touchDirX = Math.abs(nx) > 0.25 ? nx : 0;
      this.controls.touchDirZ = Math.abs(ny) > 0.25 ? ny : 0;
      this.controls.touchRun = Math.hypot(nx, ny) > 0.85;
      this.thumb.setPosition(this.baseX + dx, this.baseY + dy);
    };

    this.scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // Claim a touch that starts on the left half for the stick.
      if (this.stickPointerId === -1 && p.x < GAME_WIDTH * 0.5) {
        this.stickPointerId = p.id;
        update(p);
      }
    });
    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id === this.stickPointerId) {
        update(p);
      }
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (p.id === this.stickPointerId) {
        this.stickPointerId = -1;
        this.controls.touchDirX = 0;
        this.controls.touchDirZ = 0;
        this.controls.touchRun = false;
        this.thumb.setPosition(this.baseX, this.baseY);
      }
    };
    this.scene.input.on('pointerup', release);
    this.scene.input.on('pointerupoutside', release);
  }
}
