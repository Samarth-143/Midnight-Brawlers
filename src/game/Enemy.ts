import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import { Fighter, AttackDef } from './Fighter';
import { Phaserish } from './config';

export type EnemyKind = 'punk' | 'boss';

const PUNK_ATTACK: AttackDef = {
  action: 'attack',
  sfx: 'sfx-punch-heavy',
  fxKey: 'fx-punch-light',
  damage: 9,
  reach: 74,
  depthTol: 0.16,
  knockback: 210,
  launch: false,
  activeStart: 0.35,
  activeEnd: 0.62,
  duration: 0.57,
  lunge: 50,
};

const PUNK_BAT_ATTACK: AttackDef = {
  ...PUNK_ATTACK,
  sfx: 'sfx-bat',
  fxKey: 'fx-bat',
  damage: 13,
  reach: 104,
  knockback: 280,
  launch: true,
};

const BOSS_ATTACK: AttackDef = {
  action: 'attack',
  sfx: 'sfx-boss-smash',
  fxKey: 'fx-boss-hit',
  damage: 20,
  reach: 104,
  depthTol: 0.22,
  knockback: 380,
  launch: true,
  activeStart: 0.4,
  activeEnd: 0.66,
  duration: 0.67,
  lunge: 30,
};

// Close-range "get off me" move: chest-pound that releases a radial shockwave.
const BOSS_SHOCKWAVE: AttackDef = {
  action: 'chest-pound',
  sfx: 'sfx-boss-pound',
  fxKey: 'fx-boss-hit',
  damage: 16,
  reach: 132, // used as a radius (radial)
  depthTol: 0.42,
  knockback: 360,
  launch: true,
  activeStart: 0.55,
  activeEnd: 0.8,
  duration: 0.67,
  lunge: 0,
  radial: true,
};

export class Enemy extends Fighter {
  kind: EnemyKind;
  dropsBat: boolean;
  private attackCooldown = 0.8;
  private repositionTimer = 0;
  private preferredSide = Math.random() < 0.5 ? -1 : 1;
  private hpBarBg?: Phaser.GameObjects.Rectangle;
  private hpBarFill?: Phaser.GameObjects.Rectangle;
  private enraged = false;
  private static readonly BAR_W = 52;
  private static readonly BAR_H = 6;

  constructor(
    scene: GameScene,
    kind: EnemyKind,
    x: number,
    depth: number,
    opts: { hp?: number; bat?: boolean } = {}
  ) {
    const isBoss = kind === 'boss';
    super(
      scene,
      isBoss ? 'boss' : 'punk',
      x,
      depth,
      opts.hp ?? (isBoss ? 400 : opts.bat ? 90 : 60),
      isBoss ? 0.72 : 0.5
    );
    this.kind = kind;
    this.dropsBat = !!opts.bat;
    this.hasBat = !!opts.bat && !isBoss;
    this.walkSpeed = isBoss ? 120 : 120 + Math.random() * 40;
    this.runSpeed = this.walkSpeed;
    this.depthSpeed = isBoss ? 1.05 : 0.9;

    if (isBoss) {
      this.animLock = 1.4;
      this.playAnim('chest-pound', true);
      this.scene.playSfx('sfx-boss-pound');
    } else {
      // Floating health bar above the head (punks only).
      this.hpBarBg = scene.add
        .rectangle(x, 0, Enemy.BAR_W, Enemy.BAR_H, 0x2a0f1c)
        .setOrigin(0, 0.5)
        .setStrokeStyle(1, 0x000000);
      this.hpBarFill = scene.add
        .rectangle(x, 0, Enemy.BAR_W - 2, Enemy.BAR_H - 2, 0x49e08a)
        .setOrigin(0, 0.5);
    }
  }

  private get attackDef(): AttackDef {
    if (this.kind === 'boss') {
      return BOSS_ATTACK;
    }
    return this.hasBat ? PUNK_BAT_ATTACK : PUNK_ATTACK;
  }

  think(dt: number): void {
    this.attackCooldown -= dt;
    this.repositionTimer -= dt;

    const hero = this.scene.hero;
    if (!hero || !hero.alive) {
      this.inputMoveX = 0;
      this.inputMoveDepth = 0;
      return;
    }

    const dx = hero.x - this.x;
    const dist = Math.abs(dx);
    const ddepth = hero.depth - this.depth;
    this.facing = (dx >= 0 ? 1 : -1) as 1 | -1;

    if (this.kind === 'boss') {
      this.thinkBoss(dx, dist, ddepth);
      return;
    }

    const def = this.attackDef;
    const inRange = dist <= def.reach * 0.78 + this.halfWidth;
    const aligned = Math.abs(ddepth) <= def.depthTol * 0.8;

    if (inRange && aligned) {
      this.inputMoveX = 0;
      this.inputMoveDepth = 0;
      if (this.attackCooldown <= 0 && this.onGround()) {
        this.startAttack(def);
        this.attackCooldown = 0.9 + Math.random() * 1.0;
      }
      return;
    }

    // Approach: close horizontal gap, then line up on the same depth lane.
    const standoff = def.reach * 0.7;
    if (dist > standoff) {
      this.inputMoveX = dx > 0 ? 1 : -1;
    } else {
      this.inputMoveX = 0;
    }
    this.inputMoveDepth = Math.abs(ddepth) > 0.04 ? (ddepth > 0 ? 1 : -1) : 0;
    this.wantRun = false;
  }

  private thinkBoss(dx: number, dist: number, ddepth: number): void {
    const smash = BOSS_ATTACK;
    const shock = BOSS_SHOCKWAVE;
    const closeRadius = 120;
    const cdMul = this.enraged ? 0.6 : 1;

    if (this.attackCooldown <= 0 && this.onGround()) {
      // When the player crowds him, release a radial shockwave.
      if (dist <= closeRadius && Math.abs(ddepth) <= shock.depthTol) {
        this.doShockwave(shock);
        this.attackCooldown = (1.1 + Math.random() * 0.5) * cdMul;
        return;
      }
      // Otherwise a heavy overhead smash when lined up.
      if (
        dist <= smash.reach * 0.8 + this.halfWidth &&
        Math.abs(ddepth) <= smash.depthTol * 0.85
      ) {
        this.startAttack(smash);
        this.attackCooldown = (0.7 + Math.random() * 0.4) * cdMul;
        return;
      }
    }

    const standoff = smash.reach * 0.7;
    this.inputMoveX = dist > standoff ? (dx > 0 ? 1 : -1) : 0;
    this.inputMoveDepth = Math.abs(ddepth) > 0.04 ? (ddepth > 0 ? 1 : -1) : 0;
    this.wantRun = false;
  }

  /** Boss enters a faster, harder-hitting state (called at half HP). */
  enrage(): void {
    if (this.enraged) {
      return;
    }
    this.enraged = true;
    this.walkSpeed *= 1.35;
    this.runSpeed = this.walkSpeed;
    this.depthSpeed *= 1.3;
    this.sprite.setTint(0xff7a7a);
  }

  private doShockwave(def: AttackDef): void {
    this.startAttack(def);
    const delay = def.activeStart * def.duration * 1000;
    this.scene.time.delayedCall(delay, () => {
      if (this.state === 'attack' && this.currentAttack === def) {
        this.scene.spawnShockwave(this.x, this.depth);
      }
    });
  }

  protected override applyTransform(): void {
    super.applyTransform();
    if (!this.hpBarBg || !this.hpBarFill) {
      return;
    }
    const show = this.alive && this.state !== 'dead';
    this.hpBarBg.setVisible(show);
    this.hpBarFill.setVisible(show);
    if (!show) {
      return;
    }
    const w = Enemy.BAR_W;
    const top = this.sprite.y - this.sprite.displayHeight * 0.72;
    const left = this.x - w / 2;
    const depth = this.sprite.depth + 2;

    this.hpBarBg.setPosition(left, top).setDepth(depth);
    const frac = Phaserish.clamp(this.hp / this.maxHp, 0, 1);
    this.hpBarFill
      .setPosition(left + 1, top)
      .setDepth(depth)
      .setSize((w - 2) * frac, Enemy.BAR_H - 2);
    this.hpBarFill.fillColor =
      frac > 0.5 ? 0x49e08a : frac > 0.25 ? 0xffd23f : 0xff3b6b;
  }

  override destroy(): void {
    this.hpBarBg?.destroy();
    this.hpBarFill?.destroy();
    super.destroy();
  }
}
