import { type } from '@/theme';

/** The button's own sides: 16pt padding and the 1pt edge, each side (Button.tsx). */
const SIDES = 2 * (16 + 1);
/** A leading icon (16–18pt) and its 8pt gap. */
const ICON = 24;
/** Average advance of a letter and of a space, in em, at ui 600 (generous: a wrong «fits» clips). */
const LETTER = 0.52;
const SPACE = 0.3;

interface RowFitInput {
  /** The row's measured width; 0 = not laid out yet. */
  width: number;
  /** One per cell; a cell whose label is unknown counts as 14 letters. */
  labels: readonly (string | null)[];
  /** The phone's font scale (useWindowDimensions().fontScale). */
  fontScale: number;
  gap: number;
  /** Cells that carry a leading icon. */
  icons?: number;
}

/** The width a one-line label needs inside a Button at this font scale. */
export function labelWidth(label: string | null, fontScale: number): number {
  const text = label ?? 'xxxxxxxxxxxxxx';
  const spaces = text.split(' ').length - 1;
  const em = (text.length - spaces) * LETTER + spaces * SPACE;
  return em * type.size.body * fontScale + SIDES;
}

/**
 * Whether every label fits on one line in an equal-width cell (docs/07 §6 ButtonRow); otherwise the
 * row stacks its buttons full width. An unmeasured row (width 0) is taken to fit.
 */
export function rowFits({ width, labels, fontScale, gap, icons = 0 }: RowFitInput): boolean {
  if (width <= 0 || labels.length < 2) return true;
  const cell = (width - gap * (labels.length - 1)) / labels.length;
  const extra = icons > 0 ? ICON : 0;
  return labels.every((l) => labelWidth(l, fontScale) + extra <= cell);
}
