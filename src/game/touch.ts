import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, Phaserish } from './config';
import { Controls } from './input';

const DEPTH = 9000;

/**
 * On-screen controls for touch devices: a left analog stick for movement and a
 * cluster of action buttons on the right, plus a pause button. Writes directly
 * into the shared Controls instance so the Hero reads one unified input source.
 */
export class TouchControls {
  private scene: Phaser.Scene;
  private controls: Controls;

  private baseX = 120;
  private baseY = GAME_HEIGHT - 110;
  private radius = 62;
  private stickPointerId = -1;
  private thumb!: Phaser.GameObjects.Arc;

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
    this.scene.add
      .circle(this.baseX, this.baseY, this.radius, 0xffffff, 0.08)
      .setStrokeStyle(2, 0xffffff, 0.3)
      .setScrollFactor(0)
      .setDepth(DEPTH);
    this.thumb = this.scene.add
      .circle(this.baseX, this.baseY, 28, 0xff5ca8, 0.55)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);
  }

  private button(
    x: number,
    y: number,
    r: number,
    label: string,
    color: number,
    onPress: () => void
  ): void {
    const circle = this.scene.add
      .circle(x, y, r, color, 0.32)
      .setStrokeStyle(2, 0xffffff, 0.4)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setInteractive({ useHandCursor: true });
    this.scene.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    circle.on('pointerdown', () => {
      onPress();
      this.scene.tweens.add({
        targets: circle,
        scale: 0.85,
        duration: 70,
        yoyo: true,
      });
    });
  }

  private buildButtons(): void {
    const rx = GAME_WIDTH - 78;
    const by = GAME_HEIGHT - 78;
    // Punch (primary), with kick / heavy / jump around it.
    this.button(rx, by, 38, 'P', 0xff5ca8, () => this.controls.pressPulse('light'));
    this.button(rx - 88, by - 6, 32, 'K', 0x46e0ff, () => this.controls.pressPulse('kick'));
    this.button(rx - 30, by - 84, 30, 'H', 0xffd23f, () => this.controls.pressPulse('heavy'));
    this.button(rx - 120, by - 78, 34, '↑', 0x49e08a, () => this.controls.pressPulse('jump'));
  }

  private buildPauseButton(): void {
    const x = GAME_WIDTH / 2;
    const y = 26;
    const circle = this.scene.add
      .circle(x, y, 20, 0x000000, 0.35)
      .setStrokeStyle(2, 0xffffff, 0.4)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setInteractive({ useHandCursor: true });
    this.scene.add
      .text(x, y, 'II', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);
    circle.on('pointerdown', () => this.controls.pressPulse('pause'));
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
