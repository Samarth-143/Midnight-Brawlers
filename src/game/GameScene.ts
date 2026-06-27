import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, groundY, depthScale, Phaserish } from './config';
import { AUDIO } from './manifest';
import { Controls } from './input';
import { Hero } from './Hero';
import { Enemy } from './Enemy';
import { Prop } from './Prop';
import { Fighter } from './Fighter';

interface SpawnDef {
  depthFrac?: number;
  x?: number;
  weapon?: string;
  hp?: number;
  type?: string;
}
interface GateDef {
  x: number;
  spawns: SpawnDef[];
}
interface PropDef {
  id: string;
  x: number;
  depthFrac: number;
  scale: number;
}
interface BgSegment {
  panel: string;
  x: number;
  yOffset: number;
}
interface LevelData {
  width: number;
  playerStart: { x: number; depthFrac: number };
  background: {
    buildingParallax?: number;
    skyParallax?: number;
    buildingScale?: number;
    segments: BgSegment[];
  };
  gates: GateDef[];
  props: PropDef[];
}

type GameState = 'play' | 'clear' | 'over';

const PANEL_KEYS: Record<string, string> = {
  'bg-bld-a': 'bg-bld-a',
  'bg-bld-b': 'bg-bld-b',
  'bg-bld-garage': 'bg-bld-garage',
};

export class GameScene extends Phaser.Scene {
  hero!: Hero;
  private controls!: Controls;
  private level!: LevelData;
  private levelWidth = GAME_WIDTH;

  private enemies: Enemy[] = [];
  private props: Prop[] = [];
  private droppedBats: { x: number; depth: number; img: Phaser.GameObjects.Image }[] = [];

  private sky!: Phaser.GameObjects.TileSprite;
  private buildingLayer!: Phaser.GameObjects.Container;
  private street!: Phaser.GameObjects.TileSprite;

  private gameState: GameState = 'play';
  private freeze = 0;

  private gates: GateDef[] = [];
  private currentGate = 0;
  private waveActive = false;
  private camLock = 0;
  private boundLeft = 20;
  private boundRight = GAME_WIDTH;
  private scrollMin = 0;
  private scrollMax = 0;
  private boss: Enemy | null = null;

  private soundVol: Record<string, number> = {};

  // HUD
  private heroFill!: Phaser.GameObjects.Rectangle;
  private heroFillW = 1;
  private bossFill!: Phaser.GameObjects.Rectangle;
  private bossFillW = 1;
  private bossBarBg!: Phaser.GameObjects.Container;
  private banner!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private hudData!: HudAtlasData;

  private music?: Phaser.Sound.BaseSound;

  constructor() {
    super('GameScene');
  }

  create(): void {
    // Phaser reuses the scene instance across restarts, so field initializers
    // do NOT re-run. Reset all mutable gameplay state explicitly here.
    this.gameState = 'play';
    this.freeze = 0;
    this.enemies = [];
    this.props = [];
    this.droppedBats = [];
    this.currentGate = 0;
    this.waveActive = false;
    this.boss = null;
    this.camLock = 0;
    this.boundLeft = 20;
    this.boundRight = GAME_WIDTH;
    this.scrollMin = 0;
    this.scrollMax = 0;

    for (const a of AUDIO) {
      this.soundVol[a.key] = a.volume;
    }

    const raw = this.cache.json.get('level-stage-1') as { level: LevelData };
    this.level = raw.level;
    this.levelWidth = this.level.width;
    this.scrollMax = Math.max(0, this.levelWidth - GAME_WIDTH);
    this.scrollMin = 0;

    this.registerPropFrames();
    this.registerHudFrames();
    this.buildBackground();
    this.buildProps();

    this.controls = new Controls(this);
    const start = this.level.playerStart;
    this.hero = new Hero(this, this.controls, start.x, start.depthFrac);

    this.gates = [...this.level.gates].sort((a, b) => a.x - b.x);
    this.currentGate = 0;
    this.boundRight = this.gates.length ? this.gates[0].x : this.levelWidth - 60;

    this.cameras.main.setBounds(0, 0, this.levelWidth, GAME_HEIGHT);
    this.cameras.main.setScroll(
      Phaserish.clamp(this.hero.x - GAME_WIDTH * 0.4, 0, this.scrollMax),
      0
    );
    this.cameras.main.setBackgroundColor('#0e0b16');

    this.buildHud();

    this.music = this.sound.add('music-brawler', { loop: true, volume: 0.32 });
    this.music.play();

    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.gameState !== 'play') {
        this.music?.stop();
        this.scene.start('MenuScene');
      }
    });
  }

  // ---------- setup helpers ----------
  private registerPropFrames(): void {
    const manifest = this.cache.json.get('props-manifest') as
      | { props: { id: string; normal: Rect; damaged: Rect }[] }
      | undefined;
    if (!manifest) {
      return;
    }
    const tex = this.textures.get('street-props');
    for (const p of manifest.props) {
      const n = `prop-${p.id}-normal`;
      const d = `prop-${p.id}-damaged`;
      if (!tex.has(n)) {
        tex.add(n, 0, p.normal.x, p.normal.y, p.normal.width, p.normal.height);
      }
      if (!tex.has(d)) {
        tex.add(d, 0, p.damaged.x, p.damaged.y, p.damaged.width, p.damaged.height);
      }
    }
  }

  private buildBackground(): void {
    // Sky covers the viewport, parallax via tilePosition.
    this.sky = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-sky')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-100);
    const skyTex = this.textures.get('bg-sky').getSourceImage();
    this.sky.setTileScale(GAME_HEIGHT / skyTex.height, GAME_HEIGHT / skyTex.height);

    // Distant building panels placed in world space with parallax scroll factor.
    const par = this.level.background.buildingParallax ?? 0.8;
    const bScale = this.level.background.buildingScale ?? 0.6;
    this.buildingLayer = this.add.container(0, 0).setDepth(-60);
    const floorTop = groundY(0) + 10;
    for (const seg of this.level.background.segments) {
      const key = PANEL_KEYS[seg.panel];
      if (!key) {
        continue;
      }
      const img = this.add
        .image(seg.x, floorTop + (seg.yOffset ?? 0), key)
        .setOrigin(0, 1)
        .setScale(bScale)
        .setScrollFactor(par, 1);
      this.buildingLayer.add(img);
    }

    // Near street strip tiled across the whole level at the floor band.
    const streetTex = this.textures.get('bg-street').getSourceImage();
    const stripH = GAME_HEIGHT - groundY(0) + 30;
    this.street = this.add
      .tileSprite(0, groundY(0) - 10, this.levelWidth, stripH, 'bg-street')
      .setOrigin(0, 0)
      .setDepth(-30);
    this.street.setTileScale(stripH / streetTex.height, stripH / streetTex.height);
  }

  private buildProps(): void {
    for (const p of this.level.props) {
      this.props.push(new Prop(this, p.id, p.x, p.depthFrac, p.scale * 0.82));
    }
  }

  private registerHudFrames(): void {
    this.hudData = this.cache.json.get('hud-atlas-data') as HudAtlasData;
    const tex = this.textures.get('hud-atlas');
    for (const [name, f] of Object.entries(this.hudData.frames)) {
      if (!tex.has(name)) {
        tex.add(name, 0, f.x, f.y, f.w, f.h);
      }
    }
  }

  /**
   * Build a chrome health bar from the HUD atlas: a colored fill rectangle
   * sits behind the frame, sized to the frame's punched-out fillZone, and the
   * chrome frame renders on top so depletion shows through as empty.
   */
  private makeFramedBar(
    frameName: string,
    x: number,
    y: number,
    scale: number,
    color: number,
    depth: number,
    insetX: number,
    container?: Phaser.GameObjects.Container
  ): { fill: Phaser.GameObjects.Rectangle; fullW: number } {
    const f = this.hudData.frames[frameName];
    const fz = f.fillZone ?? { x: f.x, y: f.y, w: f.w, h: f.h };
    // Horizontal extent spans the frame minus the end-cap inset (the JSON
    // fillZone is too narrow and leaves gaps); vertical follows the fillZone.
    const fillX = x + insetX * scale;
    const fillY = y + (fz.y - f.y) * scale;
    const fullW = (f.w - 2 * insetX) * scale;

    const fill = this.add
      .rectangle(fillX, fillY, fullW, fz.h * scale, color)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(depth);
    const frame = this.add
      .image(x, y, 'hud-atlas', frameName)
      .setOrigin(0, 0)
      .setScale(scale)
      .setScrollFactor(0)
      .setDepth(depth + 1);

    if (container) {
      container.add([fill, frame]);
    }
    return { fill, fullW };
  }

  private buildHud(): void {
    // --- Player bar (top-left) ---
    const ps = 0.34;
    this.add
      .image(14, 6, 'hud-atlas', 'player_portrait')
      .setOrigin(0, 0)
      .setScale(ps)
      .setScrollFactor(0)
      .setDepth(10003);
    const pBar = this.makeFramedBar('player_health_frame', 104, 16, ps, 0x49e08a, 10000, 30);
    this.heroFill = pBar.fill;
    this.heroFillW = pBar.fullW;

    // --- Boss bar (top-right, mirrors the player layout; hidden until boss) ---
    this.bossBarBg = this.add.container(0, 0).setScrollFactor(0).setDepth(10000);
    const bs = 0.5;
    const margin = 14;
    const portraitScale = bs * 0.92;
    const portraitW = this.hudData.frames['boss_portrait'].w * portraitScale;
    const bossFrameW = this.hudData.frames['boss_health_frame'].w * bs;
    const bossY = 16;
    const portraitX = GAME_WIDTH - margin - portraitW;
    const bossX = Math.round(portraitX - bossFrameW + 16);
    const portrait = this.add
      .image(portraitX, bossY - 6, 'hud-atlas', 'boss_portrait')
      .setOrigin(0, 0)
      .setScale(portraitScale)
      .setScrollFactor(0)
      .setDepth(10003);
    this.bossBarBg.add(portrait);
    const bBar = this.makeFramedBar(
      'boss_health_frame',
      bossX,
      bossY,
      bs,
      0xff3b6b,
      10000,
      16,
      this.bossBarBg
    );
    this.bossFill = bBar.fill;
    this.bossFillW = bBar.fullW;
    this.bossBarBg.setVisible(false);

    this.banner = this.add
      .text(GAME_WIDTH / 2, 140, '', {
        fontFamily: 'Impact, sans-serif',
        fontSize: '44px',
        color: '#ffe24a',
        stroke: '#1a0f24',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10004)
      .setAlpha(0);

    this.overlay = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
        fontFamily: 'Impact, sans-serif',
        fontSize: '72px',
        color: '#ff5ca8',
        stroke: '#1a0f24',
        strokeThickness: 8,
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10004);

    this.hint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ede9f4',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10004);
  }

  // ---------- public API used by Fighters / Props ----------
  playSfx(key: string): void {
    if (!this.cache.audio.exists(key)) {
      return;
    }
    this.sound.play(key, { volume: this.soundVol[key] ?? 0.5 });
  }

  spawnHitFx(key: string, x: number, y: number, scale = 1): void {
    if (!this.anims.exists(key)) {
      return;
    }
    const fx = this.add
      .sprite(x, y, key)
      .setScale(scale)
      .setDepth(Math.round(y) + 400)
      .setBlendMode(Phaser.BlendModes.ADD);
    fx.play(key);
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
  }

  // ---------- main loop ----------
  update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    this.controls.update();

    if (this.gameState !== 'play') {
      return;
    }

    if (this.freeze > 0) {
      this.freeze -= dt;
    } else {
      this.hero.update(dt);
      for (const e of this.enemies) {
        e.update(dt);
      }
    }

    this.clampFighters();
    this.resolveCombat();
    this.handleBatPickups();
    this.updateWaves();
    this.updateCamera(dt);
    this.updateParallax();
    this.updateHud();
    this.checkEndStates();
  }

  private clampFighters(): void {
    this.hero.x = Phaserish.clamp(this.hero.x, this.boundLeft, this.boundRight);
    for (const e of this.enemies) {
      e.x = Phaserish.clamp(e.x, 20, this.levelWidth - 20);
    }
  }

  private hittable(f: Fighter): boolean {
    return (
      f.alive &&
      f.state !== 'down' &&
      f.state !== 'getup' &&
      f.state !== 'dead'
    );
  }

  private overlaps(attacker: Fighter, target: Fighter): boolean {
    const def = attacker.currentAttack;
    if (!def) {
      return false;
    }
    const iv = attacker.hitInterval();
    if (!iv) {
      return false;
    }
    const lo = target.x - target.halfWidth;
    const hi = target.x + target.halfWidth;
    if (hi < iv.lo || lo > iv.hi) {
      return false;
    }
    if (Math.abs(target.depth - attacker.depth) > def.depthTol) {
      return false;
    }
    if (Math.abs(target.z - attacker.z) > 130) {
      return false;
    }
    return true;
  }

  private resolveCombat(): void {
    // Hero strikes enemies and props.
    if (this.hero.attackActive() && this.hero.currentAttack) {
      const def = this.hero.currentAttack;
      for (const e of this.enemies) {
        if (!this.hittable(e) || this.hero.alreadyHit(e.id)) {
          continue;
        }
        if (this.overlaps(this.hero, e)) {
          this.applyHit(this.hero, e, def);
        }
      }
      for (const p of this.props) {
        if (!p.canBeHit() || this.hero.alreadyHit(p.id)) {
          continue;
        }
        const iv = this.hero.hitInterval()!;
        if (
          p.x + p.halfWidth >= iv.lo &&
          p.x - p.halfWidth <= iv.hi &&
          Math.abs(p.depth - this.hero.depth) <= 0.22
        ) {
          this.hero.markHit(p.id);
          p.break();
        }
      }
    }

    // Enemies strike the hero.
    if (!this.hittable(this.hero)) {
      return;
    }
    for (const e of this.enemies) {
      if (e.attackActive() && e.currentAttack && !e.alreadyHit(this.hero.id)) {
        if (this.overlaps(e, this.hero)) {
          this.applyHit(e, this.hero, e.currentAttack);
        }
      }
    }
  }

  private applyHit(
    attacker: Fighter,
    target: Fighter,
    def: NonNullable<Fighter['currentAttack']>
  ): void {
    target.takeHit(def.damage, attacker.facing, def.knockback, def.launch);
    attacker.markHit(target.id);

    const cx = target.x - attacker.facing * target.halfWidth * 0.5;
    const cy = groundY(target.depth) - target.z - 80 * (target.currentScale / 0.5) * 0.5;
    const fxScale = 0.7 + target.currentScale;
    this.spawnHitFx(def.fxKey, cx, cy, fxScale);
    this.playSfx('sfx-enemy-hit');

    this.freeze = def.launch ? 0.06 : 0.03;
    if (def.launch) {
      this.cameras.main.shake(90, 0.006);
    }
  }

  private handleBatPickups(): void {
    if (this.hero.hasBat) {
      return;
    }
    for (let i = this.droppedBats.length - 1; i >= 0; i--) {
      const b = this.droppedBats[i];
      if (
        Math.abs(b.x - this.hero.x) < 50 &&
        Math.abs(b.depth - this.hero.depth) < 0.22
      ) {
        this.hero.pickUpBat();
        this.playSfx('sfx-coin');
        b.img.destroy();
        this.droppedBats.splice(i, 1);
      }
    }
  }

  private updateWaves(): void {
    // Remove dead enemies, dropping bats where appropriate.
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.state === 'dead') {
        if (e.dropsBat) {
          this.dropBat(e.x, e.depth);
        }
        if (e === this.boss) {
          this.boss = null;
        }
        e.destroy();
        this.enemies.splice(i, 1);
      }
    }

    if (!this.waveActive) {
      // Trigger the next gate when the hero reaches it.
      if (
        this.currentGate < this.gates.length &&
        this.hero.x >= this.gates[this.currentGate].x - 30
      ) {
        this.triggerWave(this.gates[this.currentGate]);
      }
      return;
    }

    // Wave cleared?
    if (this.enemies.length === 0) {
      this.waveActive = false;
      this.bossBarBg.setVisible(false);
      this.currentGate++;
      this.scrollMin = 0;
      this.scrollMax = Math.max(0, this.levelWidth - GAME_WIDTH);
      this.boundLeft = 20;
      this.boundRight =
        this.currentGate < this.gates.length
          ? this.gates[this.currentGate].x
          : this.levelWidth - 60;

      if (this.currentGate >= this.gates.length) {
        this.stageClear();
      } else {
        this.showBanner('GO!');
      }
    }
  }

  private triggerWave(gate: GateDef): void {
    this.waveActive = true;
    this.camLock = Phaserish.clamp(
      this.hero.x - GAME_WIDTH * 0.4,
      0,
      Math.max(0, this.levelWidth - GAME_WIDTH)
    );
    this.scrollMin = this.camLock;
    this.scrollMax = this.camLock;
    this.boundLeft = this.camLock + 40;
    this.boundRight = this.camLock + GAME_WIDTH - 60;

    let i = 0;
    let hasBoss = false;
    for (const s of gate.spawns) {
      const isBoss = s.type === 'boss';
      const depth = s.depthFrac ?? 0.3 + Math.random() * 0.6;
      const fromRight = isBoss || i % 2 === 0;
      const ex = Phaserish.clamp(
        this.camLock + (fromRight ? GAME_WIDTH + 130 : -130),
        30,
        this.levelWidth - 30
      );
      const enemy = new Enemy(this, isBoss ? 'boss' : 'punk', ex, depth, {
        hp: s.hp,
        bat: s.weapon === 'bat',
      });
      this.enemies.push(enemy);
      if (isBoss) {
        this.boss = enemy;
        hasBoss = true;
      }
      i++;
    }

    if (hasBoss) {
      this.bossBarBg.setVisible(true);
      this.showBanner('BOSS FIGHT');
    } else {
      this.showBanner('FIGHT!');
    }
  }

  private dropBat(x: number, depth: number): void {
    const img = this.add
      .image(x, groundY(depth), 'item-bat')
      .setOrigin(0.5, 0.8)
      .setScale(0.32 * depthScale(depth, 1, 0.32))
      .setDepth(Math.round(groundY(depth)) + 5);
    this.droppedBats.push({ x, depth, img });
  }

  private updateCamera(dt: number): void {
    const target = Phaserish.clamp(
      this.hero.x - GAME_WIDTH * 0.4,
      this.scrollMin,
      this.scrollMax
    );
    const cam = this.cameras.main;
    cam.setScroll(Phaserish.lerp(cam.scrollX, target, Math.min(1, dt * 6)), 0);
  }

  private updateParallax(): void {
    const sx = this.cameras.main.scrollX;
    this.sky.tilePositionX = sx * 0.3;
  }

  private updateHud(): void {
    const hpFrac = Phaserish.clamp(this.hero.hp / this.hero.maxHp, 0, 1);
    this.heroFill.setSize(this.heroFillW * hpFrac, this.heroFill.height);
    this.heroFill.fillColor =
      hpFrac > 0.5 ? 0x49e08a : hpFrac > 0.25 ? 0xffd23f : 0xff3b6b;

    if (this.boss) {
      const bf = Phaserish.clamp(this.boss.hp / this.boss.maxHp, 0, 1);
      this.bossFill.setSize(this.bossFillW * bf, this.bossFill.height);
    }
  }

  private showBanner(text: string): void {
    this.banner.setText(text).setAlpha(1).setScale(1.4);
    this.tweens.add({
      targets: this.banner,
      scale: 1,
      duration: 250,
      ease: 'Back.out',
    });
    this.tweens.add({
      targets: this.banner,
      alpha: 0,
      delay: 900,
      duration: 400,
    });
  }

  private checkEndStates(): void {
    if (this.gameState !== 'play') {
      return;
    }
    if (!this.hero.alive && this.hero.state === 'dead') {
      this.gameOver();
    }
  }

  private stageClear(): void {
    this.gameState = 'clear';
    this.playSfx('sfx-level-complete');
    this.overlay.setText('STAGE CLEAR');
    this.hint.setText('Press ENTER for the title screen');
  }

  private gameOver(): void {
    this.gameState = 'over';
    this.overlay.setText('GAME OVER').setColor('#ff3b6b');
    this.hint.setText('Press ENTER to try again');
  }
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HudFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  fillZone?: { x: number; y: number; w: number; h: number };
}
interface HudAtlasData {
  frames: Record<string, HudFrame>;
}
