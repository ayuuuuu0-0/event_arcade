export type FighterAnimState =
  | "idle"
  | "attack"
  | "crit"
  | "dodge"
  | "hit_recv"
  | "powerup"
  | "ko";

export interface AnimFrame {
  frameIdx: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  brightness: number;
  ms: number;
}

export interface AnimSequence {
  frames: AnimFrame[];
  loop: boolean;
  spriteKey: keyof typeof SPRITE_KEY_MAP;
}

const SPRITE_KEY_MAP = {
  idle: "idle",
  attack: "attack",
  dodge: "dodge",
  hit: "hit",
  ko: "ko",
} as const;

function f(
  frameIdx: number,
  x: number,
  y: number,
  ms: number,
  opts?: { scaleX?: number; scaleY?: number; opacity?: number; brightness?: number }
): AnimFrame {
  return {
    frameIdx,
    x,
    y,
    scaleX: opts?.scaleX ?? 1,
    scaleY: opts?.scaleY ?? 1,
    opacity: opts?.opacity ?? 1,
    brightness: opts?.brightness ?? 1,
    ms,
  };
}

export const ANIM_SEQUENCES: Record<FighterAnimState, AnimSequence> = {
  idle: {
    spriteKey: "idle",
    loop: true,
    frames: [
      f(0, 0, 0, 600),
      f(0, 0, -5, 600, { scaleX: 1.01, scaleY: 0.99 }),
      f(0, 0, 0, 600),
      f(0, 0, 3, 600, { scaleX: 0.99, scaleY: 1.01 }),
    ],
  },

  attack: {
    spriteKey: "attack",
    loop: false,
    frames: [
      f(0, 0, 0, 150),
      f(0, 25, 0, 120),
      f(1, 70, 0, 180),
      f(1, 80, 0, 160, { brightness: 1.3 }),
      f(0, 45, 0, 120),
      f(0, 15, 0, 100),
    ],
  },

  crit: {
    spriteKey: "attack",
    loop: false,
    frames: [
      f(0, 0, 0, 120),
      f(0, 20, -10, 120, { brightness: 1.5 }),
      f(1, 90, -5, 200, { brightness: 2.0, scaleX: 1.1, scaleY: 1.1 }),
      f(1, 100, 0, 220, { brightness: 2.5, scaleX: 1.15, scaleY: 1.15 }),
      f(1, 70, 0, 150, { brightness: 1.5 }),
      f(0, 30, 0, 120),
      f(0, 0, 0, 100),
    ],
  },

  dodge: {
    spriteKey: "dodge",
    loop: false,
    frames: [
      f(0, 0, 0, 100),
      f(0, -25, -50, 160),
      f(0, -40, -85, 200, { opacity: 0.6 }),
      f(0, -35, -70, 180, { opacity: 0.5 }),
      f(0, -18, -35, 150, { opacity: 0.7 }),
      f(0, 0, 0, 120),
    ],
  },

  hit_recv: {
    spriteKey: "hit",
    loop: false,
    frames: [
      f(0, 0, 0, 80, { brightness: 3.0 }),
      f(0, -30, -5, 130, { brightness: 2.0 }),
      f(0, -40, 0, 160),
      f(0, -25, 0, 120),
      f(0, -10, 0, 100),
    ],
  },

  powerup: {
    spriteKey: "idle",
    loop: false,
    frames: [
      f(0, 0, 0, 160),
      f(0, 0, -6, 220, { brightness: 1.5, scaleX: 1.05, scaleY: 1.05 }),
      f(0, 0, -10, 300, { brightness: 2.0, scaleX: 1.1, scaleY: 1.1 }),
      f(0, 0, -6, 280, { brightness: 2.5, scaleX: 1.15, scaleY: 1.15 }),
      f(0, 0, -3, 200, { brightness: 1.5, scaleX: 1.05, scaleY: 1.05 }),
      f(0, 0, 0, 160),
    ],
  },

  ko: {
    spriteKey: "ko",
    loop: false,
    frames: [
      f(0, 0, 0, 150, { brightness: 3.0 }),
      f(0, -25, -25, 200, { brightness: 2.0, opacity: 0.9 }),
      f(0, -45, 0, 350, { opacity: 0.85 }),
      f(0, -45, 25, 500, { opacity: 0.8 }),
      f(0, -35, 35, 600_000, { opacity: 0.8 }),
    ],
  },
};
