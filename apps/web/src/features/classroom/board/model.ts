import type { JoinRole } from '@ab/shared';

/**
 * The shared whiteboard, as data. Coordinates are normalised to 0..1 of a fixed 16:9 board, so a
 * phone and a laptop draw the same picture. `pts` is flat: [x0, y0, x1, y1, …].
 */

/** Pen colours are theme token names (`--ink`, `--lapis`, …): each viewer resolves its own theme. */
export const PEN_COLORS = ['ink', 'lapis', 'cinnabar', 'saffron', 'gold'] as const;
export type PenColor = (typeof PEN_COLORS)[number];

export interface Stroke {
  id: string;
  /** The author's identity: only they may undo it. */
  by: string;
  color: PenColor;
  /** Line width as a fraction of the board width. */
  width: number;
  erase: boolean;
  pts: number[];
}

export interface BoardState {
  strokes: Stroke[];
  /** «السماح للطلاب بالكتابة»: the teacher lets guests draw too. */
  studentsCanDraw: boolean;
  /** The staff opened the board for everyone. */
  open: boolean;
}

export const EMPTY_BOARD: BoardState = { strokes: [], studentsCanDraw: false, open: false };

/** The canvas' own pixel size (CSS scales it); also the size of the shared-board video. */
export const BOARD_SIZE = { width: 1600, height: 900 } as const;

export const PEN_WIDTH = 0.004;
export const ERASER_WIDTH = 0.03;

const STAFF: ReadonlySet<JoinRole> = new Set<JoinRole>(['teacher', 'admin', 'assistant']);

/** Teacher, admin and assistant always; a guest (student / guardian) only when allowed; sales never. */
export function canDraw(role: JoinRole | null, studentsCanDraw: boolean): boolean {
  if (role === null) return false;
  return STAFF.has(role) || (role === 'guest' && studentsCanDraw);
}

/** Opens / closes the board for everyone and clears it. */
export const canManageBoard = (role: JoinRole | null): boolean => role !== null && STAFF.has(role);

/** «السماح للطلاب بالكتابة» is the teacher's call (and the admin's). */
export const canAllowStudents = (role: JoinRole | null): boolean => role === 'teacher' || role === 'admin';

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/** 4 decimals = 0.16px on the 1600px board: plenty, and keeps the messages small. */
export const round4 = (n: number): number => Math.round(clamp01(n) * 1e4) / 1e4;

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A pointer position on the element → board coordinates (0..1, rounded). */
export function normalize(point: { x: number; y: number }, rect: RectLike): [number, number] {
  if (rect.width <= 0 || rect.height <= 0) return [0, 0];
  return [round4((point.x - rect.left) / rect.width), round4((point.y - rect.top) / rect.height)];
}

/** The newest stroke this person drew (their «تراجع» target). */
export function lastStrokeOf(strokes: readonly Stroke[], by: string): Stroke | undefined {
  for (let i = strokes.length - 1; i >= 0; i -= 1) {
    const s = strokes[i];
    if (s && s.by === by) return s;
  }
  return undefined;
}

/** Unique enough across the room: identity + a local counter + time. */
export const strokeId = (by: string, seq: number): string => `${by}#${seq}.${Date.now().toString(36)}`;
