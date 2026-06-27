// Core tunables and world geometry for Midnight Brawlers.

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// The walkable "floor band" as fractions of screen height (from the level data).
// depth 0 = far (top of band), depth 1 = near (bottom of band).
export const BAND_MIN_FRAC = 0.66;
export const BAND_MAX_FRAC = 0.94;

export function bandMinY(): number {
  return GAME_HEIGHT * BAND_MIN_FRAC;
}
export function bandMaxY(): number {
  return GAME_HEIGHT * BAND_MAX_FRAC;
}

// Ground screen-Y for a given depth (0..1).
export function groundY(depth: number): number {
  const d = Phaserish.clamp(depth, 0, 1);
  return bandMinY() + d * (bandMaxY() - bandMinY());
}

// Subtle pseudo-perspective scale based on depth.
export function depthScale(depth: number, base = 0.5, spread = 0.16): number {
  const d = Phaserish.clamp(depth, 0, 1);
  return base + d * spread;
}

// Physics for jumping (vertical "z" off the ground, in pixels).
export const JUMP_VELOCITY = 560;
export const GRAVITY = 1500;

// Native character art faces WEST (left). flipX when facing right.
export const NATIVE_FACING: 1 | -1 = -1;

export const Phaserish = {
  clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v;
  },
  lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  },
};

// Frame size for all humanoid character sheets.
export const CHAR_FRAME = 256;
// Frame size for the impact FX sheets.
export const FX_FRAME = 200;
