import type { Palette, ThemeName } from '../../../theme';

export const BLOCK = 220;

export const GLOW = 168;

/** The disc and the ring's track per scheme (approved design, 2026-10-26). */
export function emblemColors(name: ThemeName, color: Palette) {
  return name === 'dark'
    ? { glow: color.leatherLift, track: color.leatherLift, arc: color.gold }
    : { glow: color.page, track: color.leatherDeep, arc: color.gold };
}
