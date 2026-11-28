import type { Palette } from '../../../theme';

/** The bubble's padding (a template's button rows reach past it to the edges). */
export const BUBBLE_PAD = { x: 10, bottom: 6 } as const;

export function edgeOf(ours: boolean, highlight: boolean, color: Palette): string {
  if (highlight) return color.lapis;
  return ours ? color.lapisWash : color.rule;
}
