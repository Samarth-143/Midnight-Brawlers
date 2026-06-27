import Phaser from 'phaser';

type PulseName = 'jump' | 'light' | 'heavy' | 'kick' | 'pause';

/** Tracks held + just-pressed state, merging keyboard and on-screen touch. */
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
  pause = false;

  // Set by the on-screen touch controls (analog stick + buttons).
  touchDirX = 0;
  touchDirZ = 0;
  touchRun = false;
  private pulses: Record<PulseName, boolean> = {
    jump: false,
    light: false,
    heavy: false,
    kick: false,
    pause: false,
  };

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
        esc: Phaser.Input.Keyboard.KeyCodes.ESC,
      },
      false
    ) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  /** Fire a one-shot action from the touch UI; consumed on the next update. */
  pressPulse(name: PulseName): void {
    this.pulses[name] = true;
  }

  private justDown(key: Phaser.Input.Keyboard.Key): boolean {
    return Phaser.Input.Keyboard.JustDown(key);
  }

  /** Call once per frame before reading. */
  update(): void {
    const k = this.keys;
    const tx = this.touchDirX;
    const tz = this.touchDirZ;

    this.left = k.left.isDown || k.a.isDown || tx < -0.3;
    this.right = k.right.isDown || k.d.isDown || tx > 0.3;
    this.up = k.up.isDown || k.w.isDown || tz < -0.3;
    this.down = k.down.isDown || k.s.isDown || tz > 0.3;
    this.run = k.shift.isDown || this.touchRun;

    // Edge-triggered actions (keyboard JustDown OR a consumed touch pulse).
    const p = this.pulses;
    this.jump = this.justDown(k.space) || p.jump;
    this.light = this.justDown(k.j) || p.light;
    this.heavy = this.justDown(k.k) || p.heavy;
    this.kick = this.justDown(k.l) || p.kick;
    this.pause = this.justDown(k.esc) || p.pause;

    p.jump = p.light = p.heavy = p.kick = p.pause = false;
  }
}
