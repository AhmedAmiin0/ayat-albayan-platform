// Where the floating day chip may show (owner 2026-10-27, as WhatsApp): never over an inline day
// separator. Pure geometry over the inverted list: VirtualizedList's own cell frames (onLayout, in
// content coordinates) and the scroll offset, so it is unit-tested without a device.

/** A cell's frame in the list's content: offset 0 is the newest message (the visual bottom). */
export interface Frame {
  y: number;
  height: number;
}

/** The scroll offset and the visible length of the list (onScroll). */
export interface Viewport {
  offset: number;
  length: number;
}

/** A row on screen that carries a day separator: its message id, label, and its chip's top in the row. */
export interface Separator {
  key: string;
  label: string;
  inset: number;
}

export interface BandInput {
  frames: ReadonlyMap<string, Frame>;
  seps: readonly Separator[];
  view: Viewport;
  /** The chip's own height (it grows with the system font). */
  chip: number;
  /** The floating chip's label. */
  label: string | null;
}

/** DayChip's box (it reads these): margin, padding and border, vertical; its pill starts 4 + 6 down. */
export const CHIP_MARGIN = 6;
export const CHIP_PAD = 3;
export const CHIP_BORDER = 1;
/** The pill's height beyond its line: padding and border, both sides. */
export const CHIP_BOX = 2 * (CHIP_PAD + CHIP_BORDER);
/** The floating chip's top (FloatingDay). */
export const FLOAT_TOP = 4;
/** A little air under the floating chip that already counts as its band. */
const AIR = 4;

/**
 * How far under the list's visual top the cell's top edge is. Inverted: the content's far end is the
 * visual top, and each cell is flipped back upright, so its top edge is its frame's far end.
 */
export function cellTop(frame: Frame, view: Viewport): number {
  return view.offset + view.length - (frame.y + frame.height);
}

/**
 * Whether the floating chip must hide: an inline separator is in its band (the inline one takes its
 * place until it has scrolled past), or the separator of its own day is on screen (never two chips
 * with the same label). A row with no frame yet counts as off screen.
 */
export function chipCovered({ frames, seps, view, chip, label }: BandInput): boolean {
  return seps.some((sep) => {
    const frame = frames.get(sep.key);
    if (!frame) return false;
    const top = cellTop(frame, view) + sep.inset;
    if (top + chip <= 0 || top >= view.length) return false;
    return top < FLOAT_TOP + CHIP_MARGIN + chip + AIR || sep.label === label;
  });
}
