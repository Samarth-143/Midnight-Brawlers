import Phaser from 'phaser';

/** Tracks held + just-pressed state for the gameplay controls. */
export class Controls {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;

  left = false;
  right = false;
  up = false;
  down = false;
  run = false;

  jump = false;
  light = false;
  heavy = false;
  kick = false;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.keys = kb.addKeys(
      {
        left: Phaser.Input.Keyboard.KeyCodes.LEFT,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        d: Phaser.Input.Keyboard.KeyCodes.D,
        up: Phaser.Input.Keyboard.KeyCodes.UP,
        w: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.DOWN,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
        j: Phaser.Input.Keyboard.KeyCodes.J,
        k: Phaser.Input.Keyboard.KeyCodes.K,
        l: Phaser.Input.Keyboard.KeyCodes.L,
      },
      false
    ) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  private justDown(key: Phaser.Input.Keyboard.Key): boolean {
    return Phaser.Input.Keyboard.JustDown(key);
  }

  /** Call once per frame before reading. */
  update(): void {
    const k = this.keys;
    this.left = k.left.isDown || k.a.isDown;
    this.right = k.right.isDown || k.d.isDown;
    this.up = k.up.isDown || k.w.isDown;
    this.down = k.down.isDown || k.s.isDown;
    this.run = k.shift.isDown;

    // Edge-triggered actions.
    this.jump = this.justDown(k.space);
    this.light = this.justDown(k.j);
    this.heavy = this.justDown(k.k);
    this.kick = this.justDown(k.l);
  }
}
