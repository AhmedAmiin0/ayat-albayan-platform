import { boardMessageSchema, type BoardMessage } from '@ab/shared';
import type { BoardState, Stroke } from './model';

/** The LiveKit data topic of the whiteboard (reliable). */
export const BOARD_TOPIC = 'board';

export type { BoardMessage };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const encodeMessage = (msg: BoardMessage): Uint8Array => encoder.encode(JSON.stringify(msg));

/**
 * Bytes from the data channel → a message (`boardMessageSchema`), or null for anything malformed
 * (never throws).
 */
export function decodeMessage(bytes: Uint8Array): BoardMessage | null {
  try {
    const parsed = boardMessageSchema.safeParse(JSON.parse(decoder.decode(bytes)));
    return parsed.success ? parsed.data : null;
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
