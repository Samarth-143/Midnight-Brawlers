import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import { groundY, depthScale } from './config';

let PROP_ID = 100000;

/** A destructible street prop with a normal and a damaged frame. */
export class Prop {
  readonly id = PROP_ID++;
  x: number;
  depth: number;
  broken = false;
  halfWidth: number;
  private image: Phaser.GameObjects.Image;
  private scene: GameScene;
  private normalFrame: string;
  private damagedFrame: string;

  constructor(
    scene: GameScene,
    propId: string,
    x: number,
    depth: number,
    scale: number
  ) {
    this.scene = scene;
    this.x = x;
    this.depth = depth;
    this.normalFrame = `prop-${propId}-normal`;
    this.damagedFrame = `prop-${propId}-damaged`;

    const gy = groundY(depth);
    const s = scale * depthScale(depth, 1, 0.32);
    this.image = scene.add
      .image(x, gy, 'street-props', this.normalFrame)
      .setOrigin(0.5, 1.0)
      .setScale(s)
      .setDepth(Math.round(gy) + 40);
    this.halfWidth = (this.image.displayWidth * 0.5) * 0.55;
  }

  canBeHit(): boolean {
    return !this.broken;
  }

  break(): void {
    if (this.broken) {
      return;
    }
    this.broken = true;
    if (this.scene.textures.get('street-props').has(this.damagedFrame)) {
      this.image.setFrame(this.damagedFrame);
    }
    this.scene.playSfx('sfx-prop-break');
    this.scene.spawnHitFx('fx-sparks', this.x, groundY(this.depth) - 30, 1);
    // Settle the broken prop and fade it slightly.
    this.scene.tweens.add({
      targets: this.image,
      alpha: 0.85,
      angle: Phaser.Math.Between(-6, 6),
      duration: 200,
    });
  }

  get centerY(): number {
    return groundY(this.depth) - this.image.displayHeight * 0.5;
  }
}
