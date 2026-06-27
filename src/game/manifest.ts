// Asset manifest: every spritesheet, image, FX sheet and audio clip we load,
// with verified frame counts so animations never show trailing blank frames.

export interface SheetDef {
  key: string;
  url: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  fps: number;
  repeat: number; // -1 loops forever
}

export interface ImageDef {
  key: string;
  url: string;
}

export interface AudioDef {
  key: string;
  url: string;
  volume: number;
}

const B = '/assets/street-brawler';
const P = '/assets/street-punk';
const O = '/assets/street-boss';

// ---- Character animation sheets (256x256, 5 columns) ----
export const CHARACTER_SHEETS: SheetDef[] = [
  // Hero / brawler
  { key: 'hero-idle', url: `${B}/idle.png`, frameWidth: 256, frameHeight: 256, frames: 12, fps: 8, repeat: -1 },
  { key: 'hero-walk', url: `${B}/walk.png`, frameWidth: 256, frameHeight: 256, frames: 8, fps: 10, repeat: -1 },
  { key: 'hero-run', url: `${B}/run.png`, frameWidth: 256, frameHeight: 256, frames: 8, fps: 14, repeat: -1 },
  { key: 'hero-light', url: `${B}/light-attack.png`, frameWidth: 256, frameHeight: 256, frames: 8, fps: 16, repeat: 0 },
  { key: 'hero-heavy', url: `${B}/heavy-attack.png`, frameWidth: 256, frameHeight: 256, frames: 12, fps: 16, repeat: 0 },
  { key: 'hero-kick', url: `${B}/kick.png`, frameWidth: 256, frameHeight: 256, frames: 8, fps: 16, repeat: 0 },
  { key: 'hero-jump', url: `${B}/jump.png`, frameWidth: 256, frameHeight: 256, frames: 6, fps: 10, repeat: 0 },
  { key: 'hero-hurt', url: `${B}/hurt.png`, frameWidth: 256, frameHeight: 256, frames: 6, fps: 12, repeat: 0 },
  { key: 'hero-knockdown', url: `${B}/knockdown.png`, frameWidth: 256, frameHeight: 256, frames: 12, fps: 14, repeat: 0 },
  { key: 'hero-getup', url: `${B}/get-up.png`, frameWidth: 256, frameHeight: 256, frames: 12, fps: 12, repeat: 0 },
  { key: 'hero-bat-idle', url: `${B}/bat-idle.png`, frameWidth: 256, frameHeight: 256, frames: 10, fps: 8, repeat: -1 },
  { key: 'hero-bat-walk', url: `${B}/bat-walk.png`, frameWidth: 256, frameHeight: 256, frames: 8, fps: 10, repeat: -1 },
  { key: 'hero-bat-attack', url: `${B}/bat-attack.png`, frameWidth: 256, frameHeight: 256, frames: 8, fps: 16, repeat: 0 },
  { key: 'hero-bat-hurt', url: `${B}/bat-hurt.png`, frameWidth: 256, frameHeight: 256, frames: 6, fps: 12, repeat: 0 },

  // Punk enemy
  { key: 'punk-idle', url: `${P}/idle.png`, frameWidth: 256, frameHeight: 256, frames: 12, fps: 8, repeat: -1 },
  { key: 'punk-walk', url: `${P}/walk.png`, frameWidth: 256, frameHeight: 256, frames: 8, fps: 10, repeat: -1 },
  { key: 'punk-attack', url: `${P}/attack.png`, frameWidth: 256, frameHeight: 256, frames: 8, fps: 14, repeat: 0 },
  { key: 'punk-hurt', url: `${P}/hurt.png`, frameWidth: 256, frameHeight: 256, frames: 6, fps: 12, repeat: 0 },
  { key: 'punk-knockdown', url: `${P}/knockdown.png`, frameWidth: 256, frameHeight: 256, frames: 12, fps: 14, repeat: 0 },
  { key: 'punk-getup', url: `${P}/get-up.png`, frameWidth: 256, frameHeight: 256, frames: 12, fps: 12, repeat: 0 },
  { key: 'punk-bat-idle', url: `${P}/bat-idle.png`, frameWidth: 256, frameHeight: 256, frames: 10, fps: 8, repeat: -1 },
  { key: 'punk-bat-walk', url: `${P}/bat-walk.png`, frameWidth: 256, frameHeight: 256, frames: 8, fps: 10, repeat: -1 },
  { key: 'punk-bat-attack', url: `${P}/bat-attack.png`, frameWidth: 256, frameHeight: 256, frames: 7, fps: 14, repeat: 0 },
  { key: 'punk-bat-hurt', url: `${P}/bat-hurt.png`, frameWidth: 256, frameHeight: 256, frames: 6, fps: 12, repeat: 0 },

  // Boss
  { key: 'boss-idle', url: `${O}/idle.png`, frameWidth: 256, frameHeight: 256, frames: 12, fps: 8, repeat: -1 },
  { key: 'boss-walk', url: `${O}/walk.png`, frameWidth: 256, frameHeight: 256, frames: 8, fps: 9, repeat: -1 },
  { key: 'boss-attack', url: `${O}/attack.png`, frameWidth: 256, frameHeight: 256, frames: 8, fps: 12, repeat: 0 },
  { key: 'boss-chest-pound', url: `${O}/chest-pound.png`, frameWidth: 256, frameHeight: 256, frames: 8, fps: 12, repeat: 0 },
  { key: 'boss-hurt', url: `${O}/hurt.png`, frameWidth: 256, frameHeight: 256, frames: 6, fps: 12, repeat: 0 },
  { key: 'boss-knockdown', url: `${O}/knockdown.png`, frameWidth: 256, frameHeight: 256, frames: 12, fps: 14, repeat: 0 },
  { key: 'boss-getup', url: `${O}/get-up.png`, frameWidth: 256, frameHeight: 256, frames: 12, fps: 10, repeat: 0 },
];

// ---- Impact FX sheets (1200x200 => 6 frames of 200x200) ----
export const FX_SHEETS: SheetDef[] = [
  { key: 'fx-punch-light', url: '/assets/fx/anim/punch_light.png', frameWidth: 200, frameHeight: 200, frames: 6, fps: 28, repeat: 0 },
  { key: 'fx-punch-heavy', url: '/assets/fx/anim/punch_heavy.png', frameWidth: 200, frameHeight: 200, frames: 6, fps: 28, repeat: 0 },
  { key: 'fx-kick', url: '/assets/fx/anim/kick_finisher.png', frameWidth: 200, frameHeight: 200, frames: 6, fps: 28, repeat: 0 },
  { key: 'fx-bat', url: '/assets/fx/anim/bat_impact.png', frameWidth: 200, frameHeight: 200, frames: 6, fps: 28, repeat: 0 },
  { key: 'fx-boss-hit', url: '/assets/fx/anim/boss_hit.png', frameWidth: 200, frameHeight: 200, frames: 6, fps: 28, repeat: 0 },
  { key: 'fx-sparks', url: '/assets/fx/anim/sparks.png', frameWidth: 200, frameHeight: 200, frames: 6, fps: 28, repeat: 0 },
];

// ---- Static images ----
export const IMAGES: ImageDef[] = [
  { key: 'bg-sky', url: '/assets/stage/sky-far.png' },
  { key: 'bg-street', url: '/assets/stage/street-near.png' },
  { key: 'bg-bld-a', url: '/assets/stage/buildings-a.png' },
  { key: 'bg-bld-b', url: '/assets/stage/buildings-b.png' },
  { key: 'bg-bld-garage', url: '/assets/stage/buildings-garage.png' },
  { key: 'street-props', url: '/assets/stage/props/street-props-atlas.png' },
  { key: 'item-bat', url: '/assets/items/bat.png' },
  { key: 'hud-atlas', url: '/assets/ui/hud-atlas.png' },
  { key: 'splash-keyart', url: '/assets/ui/splash-keyart.png' },
];

// ---- Audio ----
export const AUDIO: AudioDef[] = [
  { key: 'music-theme', url: '/assets/audio/music/theme.mp3', volume: 0.4 },
  { key: 'music-brawler', url: '/assets/audio/music/brawler-theme.mp3', volume: 0.32 },
  { key: 'sfx-punch-light', url: '/assets/audio/sfx/punch-light.mp3', volume: 0.5 },
  { key: 'sfx-punch-heavy', url: '/assets/audio/sfx/punch-heavy.mp3', volume: 0.58 },
  { key: 'sfx-kick', url: '/assets/audio/sfx/kick-finisher.mp3', volume: 0.66 },
  { key: 'sfx-bat', url: '/assets/audio/sfx/bat-swing.mp3', volume: 0.6 },
  { key: 'sfx-enemy-hit', url: '/assets/audio/sfx/enemy-hit.mp3', volume: 0.5 },
  { key: 'sfx-knockdown', url: '/assets/audio/sfx/knockdown-thud.mp3', volume: 0.6 },
  { key: 'sfx-jump', url: '/assets/audio/sfx/hero-jump.mp3', volume: 0.45 },
  { key: 'sfx-land', url: '/assets/audio/sfx/hero-land.mp3', volume: 0.4 },
  { key: 'sfx-coin', url: '/assets/audio/sfx/coin-pickup.mp3', volume: 0.5 },
  { key: 'sfx-prop-break', url: '/assets/audio/sfx/prop-break.mp3', volume: 0.6 },
  { key: 'sfx-boss-smash', url: '/assets/audio/sfx/boss-smash.mp3', volume: 0.75 },
  { key: 'sfx-boss-pound', url: '/assets/audio/sfx/boss-chest-pound.mp3', volume: 0.72 },
  { key: 'sfx-level-complete', url: '/assets/audio/sfx/level-complete.mp3', volume: 0.62 },
  { key: 'sfx-confirm', url: '/assets/audio/sfx/ui-confirm.mp3', volume: 0.4 },
];
