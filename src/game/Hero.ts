import type { GameScene } from './GameScene';
import { Fighter, AttackDef } from './Fighter';
import { Controls } from './input';

const LIGHT: AttackDef = {
  action: 'light',
  sfx: 'sfx-punch-light',
  fxKey: 'fx-punch-light',
  damage: 8,
  reach: 84,
  depthTol: 0.16,
  knockback: 130,
  launch: false,
  activeStart: 0.22,
  activeEnd: 0.55,
  duration: 0.42,
  lunge: 70,
};

const LIGHT2: AttackDef = {
  ...LIGHT,
  damage: 9,
  knockback: 150,
  duration: 0.4,
};

const HEAVY: AttackDef = {
  action: 'heavy',
  sfx: 'sfx-punch-heavy',
  fxKey: 'fx-punch-heavy',
  damage: 20,
  reach: 96,
  depthTol: 0.18,
  knockback: 340,
  launch: true,
  activeStart: 0.32,
  activeEnd: 0.6,
  duration: 0.72,
  lunge: 90,
};

const KICK: AttackDef = {
  action: 'kick',
  sfx: 'sfx-kick',
  fxKey: 'fx-kick',
  damage: 15,
  reach: 112,
  depthTol: 0.18,
  knockback: 300,
  launch: true,
  activeStart: 0.28,
  activeEnd: 0.55,
  duration: 0.5,
  lunge: 130,
};

const AIR_KICK: AttackDef = {
  ...KICK,
  damage: 16,
  reach: 100,
  knockback: 260,
  duration: 0.6,
  lunge: 40,
};

const BAT: AttackDef = {
  action: 'attack',
  sfx: 'sfx-bat',
  fxKey: 'fx-bat',
  damage: 22,
  reach: 130,
  depthTol: 0.2,
  knockback: 330,
  launch: true,
  activeStart: 0.3,
  activeEnd: 0.6,
  duration: 0.5,
  lunge: 80,
};

export class Hero extends Fighter {
  private controls: Controls;
  private comboIndex = 0;
  private comboTimer = 0;

  constructor(scene: GameScene, controls: Controls, x: number, depth: number) {
    super(scene, 'hero', x, depth, 100, 0.52);
    this.controls = controls;
    this.walkSpeed = 225;
    this.runSpeed = 350;
    this.facing = 1;
  }

  protected onLand(): void {
    this.scene.playSfx('sfx-land');
  }

  think(dt: number): void {
    void dt;
    const c = this.controls;

    this.inputMoveX = (c.right ? 1 : 0) - (c.left ? 1 : 0);
    this.inputMoveDepth = (c.down ? 1 : 0) - (c.up ? 1 : 0);
    this.wantRun = c.run;

    if (c.jump && this.onGround()) {
      this.jump();
      this.scene.playSfx('sfx-jump');
      return;
    }

    if (c.light) {
      this.doCombo();
    } else if (c.heavy) {
      this.startAttack(this.withBat(HEAVY));
      this.comboIndex = 0;
    } else if (c.kick) {
      this.startAttack(this.withBat(this.onGround() ? KICK : AIR_KICK));
      this.comboIndex = 0;
    }
  }

  /** Light-attack combo: punch, punch, heavy finisher. */
  private doCombo(): void {
    if (this.comboTimer <= 0) {
      this.comboIndex = 0;
    }
    let def: AttackDef;
    if (this.comboIndex === 0) {
      def = LIGHT;
    } else if (this.comboIndex === 1) {
      def = LIGHT2;
    } else {
      def = HEAVY;
    }
    this.startAttack(this.withBat(def));
    this.comboIndex = (this.comboIndex + 1) % 3;
    this.comboTimer = 0.8;
  }

  private withBat(def: AttackDef): AttackDef {
    return this.hasBat ? { ...BAT, launch: def.launch || BAT.launch } : def;
  }

  override update(dt: number): void {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
    }
    super.update(dt);
  }

  pickUpBat(): void {
    this.hasBat = true;
  }
}
