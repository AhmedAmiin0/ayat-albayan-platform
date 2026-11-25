import { z } from 'zod';
import { clampPosition } from './player-math';

// Positions are kept on the device; one near the end counts as heard in full.

/** The device key of the positions map. */
export const RESUME_KEY = 'ab.player.resume';

/** Closer than this to either end: start from the beginning / heard in full. */
const EDGE_SECONDS = 5;

const savedSchema = z.record(z.string(), z.object({ at: z.number(), done: z.boolean() }));
export type ResumeMap = z.output<typeof savedSchema>;

/** A stored map, or none when it is missing or broken. */
export function parseResume(raw: string | null): ResumeMap {
  const parsed = savedSchema.safeParse(safeJson(raw));
  return parsed.success ? parsed.data : {};
}

const decodeJson: (text: string) => unknown = JSON.parse;

function safeJson(raw: string | null): unknown {
  try {
    return decodeJson(raw ?? '{}');
  } catch {
    return {};
  }
}

export type ListenState = { kind: 'new' } | { kind: 'partial'; at: number } | { kind: 'done' };

export function listenState(map: ResumeMap, id: string): ListenState {
  const saved = map[id];
  if (!saved) return { kind: 'new' };
  return saved.done ? { kind: 'done' } : { kind: 'partial', at: saved.at };
}

/** The map after a stop at `position` of `duration` seconds. */
export function withPosition(
  map: ResumeMap,
  input: { id: string; position: number; duration: number },
): ResumeMap {
  const at = clampPosition(input.position, input.duration);
  const done = input.duration > 0 && at >= input.duration - EDGE_SECONDS;
  const kept = done || at >= EDGE_SECONDS;
  return kept ? { ...map, [input.id]: { at: done ? 0 : at, done } } : map;
}

/** Where to start: the saved stop, or the beginning (a finished one starts over). */
export function resumeAt(map: ResumeMap, id: string): number {
  const state = listenState(map, id);
  return state.kind === 'partial' ? state.at : 0;
}
