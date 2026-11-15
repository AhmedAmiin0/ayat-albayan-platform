import { PEN_COLORS, type BoardState, type PenColor, type Stroke } from './model';

/** The LiveKit data topic of the whiteboard (reliable). */
export const BOARD_TOPIC = 'board';

/**
 * - draw: a new stroke, or more points of one already seen (same id → the points are appended);
 * - sync-request: a late joiner asks; whoever has the board answers with `sync` (chunked).
 */
export type BoardMessage =
  | { t: 'draw'; stroke: Stroke }
  | { t: 'undo'; id: string }
  | { t: 'clear' }
  | { t: 'perm'; studentsCanDraw: boolean }
  | { t: 'open'; open: boolean }
  /** «سماح» / «إيقاف كتابة {name}»: one guest may (or may no longer) draw. */
  | { t: 'allow'; who: string; allow: boolean }
  | { t: 'sync-request' }
  | { t: 'sync'; strokes: Stroke[]; studentsCanDraw: boolean; open: boolean; allowed: string[] };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const encodeMessage = (msg: BoardMessage): Uint8Array => encoder.encode(JSON.stringify(msg));

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const COLORS: ReadonlySet<string> = new Set<string>(PEN_COLORS);
const isUnit = (n: unknown): boolean => typeof n === 'number' && n >= 0 && n <= 1;

function asStroke(v: unknown): Stroke | null {
  if (!isObj(v)) return null;
  const { id, by, color, width, erase, pts } = v;
  if (typeof id !== 'string' || typeof by !== 'string' || typeof color !== 'string' || !COLORS.has(color)) return null;
  if (!isUnit(width) || typeof erase !== 'boolean' || !Array.isArray(pts) || pts.length % 2 !== 0) return null;
  if (!pts.every(isUnit)) return null;
  return { id, by, color: color as PenColor, width: width as number, erase, pts: pts as number[] };
}

/** A list of identities; absent (an older client) reads as none. */
function asIdentities(v: unknown): string[] | null {
  if (v === undefined) return [];
  return Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : null;
}

function asSync(v: Obj): BoardMessage | null {
  if (!Array.isArray(v.strokes) || typeof v.studentsCanDraw !== 'boolean' || typeof v.open !== 'boolean') return null;
  const strokes = v.strokes.map(asStroke);
  const allowed = asIdentities(v.allowed);
  if (strokes.some((s) => s === null) || allowed === null) return null;
  return { t: 'sync', strokes: strokes as Stroke[], studentsCanDraw: v.studentsCanDraw, open: v.open, allowed };
}

const asAllow = (v: Obj): BoardMessage | null =>
  typeof v.who === 'string' && typeof v.allow === 'boolean' ? { t: 'allow', who: v.who, allow: v.allow } : null;

function asMessage(v: unknown): BoardMessage | null {
  if (!isObj(v)) return null;
  switch (v.t) {
    case 'draw': {
      const stroke = asStroke(v.stroke);
      return stroke && { t: 'draw', stroke };
    }
    case 'undo':
      return typeof v.id === 'string' ? { t: 'undo', id: v.id } : null;
    case 'clear':
      return { t: 'clear' };
    case 'sync-request':
      return { t: 'sync-request' };
    case 'perm':
      return typeof v.studentsCanDraw === 'boolean' ? { t: 'perm', studentsCanDraw: v.studentsCanDraw } : null;
    case 'open':
      return typeof v.open === 'boolean' ? { t: 'open', open: v.open } : null;
    case 'allow':
      return asAllow(v);
    case 'sync':
      return asSync(v);
    default:
      return null;
  }
}

/** Bytes from the data channel → a message, or null for anything malformed (never throws). */
export function decodeMessage(bytes: Uint8Array): BoardMessage | null {
  try {
    return asMessage(JSON.parse(decoder.decode(bytes)));
  } catch {
    return null;
  }
}

/** Keeps every packet well under LiveKit's reliable-message limit. */
export const MAX_SYNC_BYTES = 12_000;

/** The whole board as `sync` messages of at most ~maxBytes each (a lone huge stroke goes alone). */
export function syncMessages(state: BoardState, maxBytes = MAX_SYNC_BYTES): BoardMessage[] {
  const flags = { studentsCanDraw: state.studentsCanDraw, open: state.open, allowed: state.allowed };
  const out: BoardMessage[] = [];
  let batch: Stroke[] = [];
  let size = 0;
  for (const stroke of state.strokes) {
    const bytes = JSON.stringify(stroke).length;
    if (batch.length > 0 && size + bytes > maxBytes) {
      out.push({ t: 'sync', strokes: batch, ...flags });
      batch = [];
      size = 0;
    }
    batch.push(stroke);
    size += bytes;
  }
  if (batch.length > 0 || out.length === 0) out.push({ t: 'sync', strokes: batch, ...flags });
  return out;
}
