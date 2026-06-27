import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import {
  groundY,
  depthScale,
  JUMP_VELOCITY,
  GRAVITY,
  NATIVE_FACING,
  Phaserish,
} from './config';

export type FighterState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'attack'
  | 'hurt'
  | 'down'
  | 'getup'
  | 'dead';

export interface AttackDef {
  action: string; // anim suffix, e.g. 'light'
  sfx: string;
  fxKey: string;
  damage: number;
  reach: number; // px in front of the body
  depthTol: number;
  knockback: number;
  launch: boolean;
  activeStart: number; // fraction of duration the hitbox turns on
  activeEnd: number;
  duration: number; // seconds
  lunge: number; // forward movement applied during the swing (px)
  radial?: boolean; // hits in a circle around the body, ignoring facing
}

let NEXT_ID = 1;

export abstract class Fighter {
  readonly id = NEXT_ID++;
  scene: GameScene;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;

  prefix: string;
  x: number;
  depth: number;
  z = 0;
  vz = 0;
  facing: 1 | -1 = 1;

  hp: number;
  maxHp: number;
  alive = true;

  baseScale: number;
  walkSpeed = 210;
  runSpeed = 330;
  depthSpeed = 1.6; // depth units (0..1) per second

  state: FighterState = 'idle';
  stateTimer = 0;

  hasBat = false;

  // Movement intent set by think().
  protected inputMoveX = 0;
  protected inputMoveDepth = 0;
  protected wantRun = false;

  // Knockback velocity (world px/s), decays over time.
  protected kbVX = 0;

  // Current attack.
  protected attack: AttackDef | null = null;
  protected attackElapsed = 0;
  private hitTargets = new Set<number>();

  protected hurtTimer = 0;
  protected downTimer = 0;
  protected wasOnGround = true;
  // While > 0, the fighter holds its current animation and cannot act
  // (used for intros/taunts like the boss chest-pound).
  protected animLock = 0;

  constructor(
    scene: GameScene,
    prefix: string,
    x: number,
    depth: number,
    maxHp: number,
    scale: number
  ) {
    this.scene = scene;
    this.prefix = prefix;
    this.x = x;
    this.depth = depth;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.baseScale = scale;

    this.shadow = scene.add
      .ellipse(x, groundY(depth), 90, 26, 0x000000, 0.35)
      .setDepth(1);

    this.sprite = scene.add
      .sprite(x, groundY(depth), `${prefix}-idle`)
      .setOrigin(0.5, 1.0);
    this.sprite.play(`${prefix}-idle`);
    this.applyTransform();
  }

  // ---- helpers ----
  protected get scale(): number {
    return this.baseScale * depthScale(this.depth, 1, 0.32);
  }
  get halfWidth(): number {
    return 34 * (this.scale / this.baseScale) * (this.baseScale / 0.5) * 0.5 + 16;
  }
  get currentScale(): number {
    return this.scale;
  }
  onGround(): boolean {
    return this.z <= 0.01;
  }
  isBusy(): boolean {
    return (
      this.state === 'attack' ||
      this.state === 'hurt' ||
      this.state === 'down' ||
      this.state === 'getup' ||
      this.state === 'dead'
    );
  }
  canAct(): boolean {
    return this.alive && !this.isBusy() && this.animLock <= 0;
  }

  protected animKey(action: string): string {
    const bat = this.hasBat ? 'bat-' : '';
    // Only some actions have bat variants.
    const batActions = new Set(['idle', 'walk', 'attack', 'hurt']);
    if (this.hasBat && batActions.has(action)) {
      return `${this.prefix}-bat-${action}`;
    }
    void bat;
    return `${this.prefix}-${action}`;
  }

  protected playAnim(action: string, restart = false): void {
    const key = this.animKey(action);
    if (!this.scene.anims.exists(key)) {
      return;
    }
    if (!restart && this.sprite.anims.currentAnim?.key === key) {
      return;
    }
    this.sprite.play(key, true);
  }

  // ---- combat ----
  startAttack(def: AttackDef): void {
    this.attack = def;
    this.attackElapsed = 0;
    this.hitTargets.clear();
    this.state = 'attack';
    this.stateTimer = 0;
    this.playAnim(def.action, true);
    this.scene.playSfx(def.sfx);
  }

  attackActive(): boolean {
    if (!this.attack || this.state !== 'attack') {
      return false;
    }
    const f = this.attackElapsed / this.attack.duration;
    return f >= this.attack.activeStart && f <= this.attack.activeEnd;
  }

  alreadyHit(id: number): boolean {
    return this.hitTargets.has(id);
  }
  markHit(id: number): void {
    this.hitTargets.add(id);
  }
  get currentAttack(): AttackDef | null {
    return this.attack;
  }

  /** World-space x interval covered by the active attack. */
  hitInterval(): { lo: number; hi: number } | null {
    if (!this.attack) {
      return null;
    }
    if (this.attack.radial) {
      // Symmetric blast around the body (e.g. the boss shockwave).
      return { lo: this.x - this.attack.reach, hi: this.x + this.attack.reach };
    }
    const front = this.x + this.facing * this.halfWidth;
    const tip = front + this.facing * this.attack.reach;
    return { lo: Math.min(front, tip), hi: Math.max(front, tip) };
  }

  heal(amount: number): void {
    if (!this.alive) {
      return;
    }
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  takeHit(
    damage: number,
    fromFacing: 1 | -1,
    knockback: number,
    launch: boolean
  ): void {
    if (!this.alive || this.state === 'dead') {
      return;
    }
    this.hp -= damage;
    this.attack = null;
    this.animLock = 0;
    this.facing = (fromFacing * -1) as 1 | -1; // turn to face the attacker
    this.kbVX = knockback * fromFacing;

    if (this.hp <= 0) {
      this.hp = 0;
      this.knockDown(true);
      return;
    }
    if (launch) {
      this.knockDown(false);
    } else {
      this.state = 'hurt';
      this.stateTimer = 0;
      this.hurtTimer = 0.34;
      this.playAnim('hurt', true);
    }
  }

  protected knockDown(fatal: boolean): void {
    this.state = 'down';
    this.stateTimer = 0;
    this.downTimer = fatal ? 999 : 0.9;
    this.vz = 360;
    this.kbVX *= 1.4;
    this.playAnim('knockdown', true);
    this.scene.playSfx('sfx-knockdown');
    if (fatal) {
      this.alive = false;
    }
  }

  // ---- per-frame ----
  think(_dt: number): void {
    // overridden
  }

  update(dt: number): void {
    this.stateTimer += dt;
    if (this.animLock > 0) {
      this.animLock -= dt;
    }

    if (this.canAct()) {
      this.inputMoveX = 0;
      this.inputMoveDepth = 0;
      this.wantRun = false;
      this.think(dt);
    }

    this.integrate(dt);
    this.advanceState(dt);
    this.applyTransform();
  }

  protected integrate(dt: number): void {
    // Vertical (jump) physics.
    if (this.z > 0 || this.vz !== 0) {
      this.z += this.vz * dt;
      this.vz -= GRAVITY * dt;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = 0;
        if (!this.wasOnGround) {
          this.onLand();
        }
      }
    }
    this.wasOnGround = this.onGround();

    // Knockback decay.
    if (this.kbVX !== 0) {
      this.x += this.kbVX * dt;
      this.kbVX *= Math.pow(0.0008, dt); // strong decay
      if (Math.abs(this.kbVX) < 4) {
        this.kbVX = 0;
      }
    }

    // Voluntary movement (only when free to act and grounded-ish).
    if ((this.state === 'idle' || this.state === 'walk' || this.state === 'run' || this.state === 'jump')) {
      const sp = this.wantRun ? this.runSpeed : this.walkSpeed;
      this.x += this.inputMoveX * sp * dt;
      if (this.onGround()) {
        this.depth = Phaserish.clamp(
          this.depth + this.inputMoveDepth * this.depthSpeed * dt,
          0,
          1
        );
      }
      if (this.inputMoveX !== 0) {
        this.facing = (this.inputMoveX > 0 ? 1 : -1) as 1 | -1;
      }
    }

    // Forward lunge during an attack.
    if (this.state === 'attack' && this.attack) {
      this.x += this.facing * this.attack.lunge * dt;
    }
  }

  protected onLand(): void {
    // overridden by Hero for sfx; base does nothing special.
  }

  protected advanceState(dt: number): void {
    void dt;
    if (this.animLock > 0) {
      // Hold the current animation (intro/taunt); skip transitions.
      return;
    }
    switch (this.state) {
      case 'attack': {
        if (this.attack) {
          this.attackElapsed += dt;
          if (this.attackElapsed >= this.attack.duration) {
            this.attack = null;
            this.toGroundedIdle();
          }
        } else {
          this.toGroundedIdle();
        }
        break;
      }
      case 'hurt': {
        this.hurtTimer -= dt;
        if (this.hurtTimer <= 0) {
          this.toGroundedIdle();
        }
        break;
      }
      case 'down': {
        if (this.onGround()) {
          this.downTimer -= dt;
          if (!this.alive) {
            // Fade the corpse out, then remove.
            if (this.stateTimer > 0.6) {
              this.beginDeathFade();
            }
          } else if (this.downTimer <= 0) {
            this.state = 'getup';
            this.stateTimer = 0;
            this.playAnim('getup', true);
          }
        }
        break;
      }
      case 'getup': {
        const anim = this.sprite.anims;
        if (!anim.isPlaying || anim.currentAnim?.key !== this.animKey('getup')) {
          this.toGroundedIdle();
        }
        break;
      }
      case 'jump': {
        if (this.onGround()) {
          this.toGroundedIdle();
        }
        break;
      }
      case 'idle':
      case 'walk':
      case 'run': {
        if (!this.onGround()) {
          break;
        }
        const moving = this.inputMoveX !== 0 || this.inputMoveDepth !== 0;
        if (moving) {
          const next = this.wantRun ? 'run' : 'walk';
          if (this.state !== next) {
            this.state = next as FighterState;
          }
          this.playAnim(next === 'run' ? 'run' : 'walk');
        } else {
          this.state = 'idle';
          this.playAnim('idle');
        }
        break;
      }
      default:
        break;
    }
  }

  protected toGroundedIdle(): void {
    this.state = 'idle';
    this.stateTimer = 0;
    this.playAnim('idle', true);
  }

  private fading = false;
  protected beginDeathFade(): void {
    if (this.fading) {
      return;
    }
    this.fading = true;
    this.scene.tweens.add({
      targets: [this.sprite, this.shadow],
      alpha: 0,
      duration: 600,
      onComplete: () => {
        this.state = 'dead';
      },
    });
  }

  jump(velocity = JUMP_VELOCITY): void {
    if (!this.onGround() || this.isBusy()) {
      return;
    }
    this.vz = velocity;
    this.z = 0.001;
    this.state = 'jump';
    this.stateTimer = 0;
    this.playAnim('jump', true);
  }

  protected applyTransform(): void {
    const gy = groundY(this.depth);
    this.sprite.x = this.x;
    this.sprite.y = gy - this.z;
    const sc = this.scale;
    this.sprite.setScale(sc);
    this.sprite.setFlipX(this.facing !== NATIVE_FACING);

    this.shadow.x = this.x;
    this.shadow.y = gy;
    this.shadow.setScale(sc / this.baseScale);
    const lift = Phaserish.clamp(1 - this.z / 220, 0.25, 1);
    this.shadow.setAlpha(0.32 * lift);
    this.shadow.scaleX *= lift;

    const d = Math.round(gy) + 50;
    this.sprite.setDepth(d);
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
