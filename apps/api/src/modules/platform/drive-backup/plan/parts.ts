import type { ListedObject } from '@/modules/platform/drive-backup/source/backup-source.port';
import { objectCost, partCost } from './cost';

export interface Caps {
  /** Bytes per archive file (its cost on Drive, cost.ts): a larger set is split into parts. */
  part: number;
  /** Bytes per run (the VPS's uplink and CPU): the rest waits for the next night. */
  run: number;
}

/** 1 GiB per part, 4 GiB per night (the server also runs the live CRM). */
export const DEFAULT_CAPS: Caps = { part: 1024 ** 3, run: 4 * 1024 ** 3 };

interface PartsPlan {
  parts: ListedObject[][];
  /** Objects left for the next run (the run's byte cap), in order. */
  left: ListedObject[];
  /** Objects whose own part is larger than tonight's room: skipped tonight, named in the alert. */
  tooLarge: ListedObject[];
}

/** Objects read as a stream (not buffered first): each gets a part of its own (see isSolo). */
export const STREAMED_MIN = 64 * 1024 * 1024;

/** A part holding one streamed object: its failure skips that object only (backup-run.ts). */
export const isSolo = (objects: readonly ListedObject[]): boolean =>
  objects.length === 1 && (objects[0]?.size ?? 0) > STREAMED_MIN;

interface Open {
  current: readonly ListedObject[];
  cost: number;
  limit: number;
}
const startsNew = (p: Open, o: ListedObject): boolean =>
  p.current.length > 0 &&
  (o.size > STREAMED_MIN || isSolo(p.current) || p.cost + objectCost(o) > p.limit);

/** In order, each part's cost under `limit`; a big object gets its own part. */
function split(todo: readonly ListedObject[], limit: number): ListedObject[][] {
  const parts: ListedObject[][] = [];
  let current: ListedObject[] = [];
  let cost = partCost([]);
  for (const o of todo) {
    if (startsNew({ current, cost, limit }, o)) {
      parts.push(current);
      current = [];
      cost = partCost([]);
    }
    current.push(o);
    cost += objectCost(o);
  }
  if (current.length > 0) parts.push(current);
  return parts;
}

/**
 * The first part above the night's cap on its own (one streamed object), moved to the front: the
 * first part always goes (it fits the room), so such an object is sent alone on a night of its own
 * instead of being left behind every night by the smaller parts listed before it.
 */
function bigFirst(parts: readonly ListedObject[][], cap: number): ListedObject[][] {
  const i = parts.findIndex((p) => partCost(p) > cap);
  return i < 1 ? [...parts] : [...parts.slice(i, i + 1), ...parts.filter((_, j) => j !== i)];
}

/** The parts the night's cap takes (the first always): one that does not fit is passed over. */
function forRun(parts: readonly ListedObject[][], cap: number): ListedObject[][] {
  const taken: ListedObject[][] = [];
  let spent = 0;
  for (const p of parts) {
    const cost = partCost(p);
    if (taken.length > 0 && spent + cost > cap) continue;
    spent += cost;
    taken.push(p);
  }
  return taken;
}

/**
 * Tonight's parts: an object larger than the room on its own is skipped (not the night's end: the
 * later ones still go), the rest split under the part cap and the room, one above the night's cap
 * put first (bigFirst), then taken up to the run's cap; a part over it waits, the smaller ones
 * after it still go. Every part planned fits the room it was planned for.
 */
export function planParts(
  todo: readonly ListedObject[],
  caps: Caps,
  room = Number.POSITIVE_INFINITY,
): PartsPlan {
  const fits = (o: ListedObject) => partCost([o]) <= room;
  const tooLarge = todo.filter((o) => !fits(o));
  const cap = Math.min(caps.run, room);
  const parts = bigFirst(split(todo.filter(fits), Math.min(caps.part, room)), cap);
  const taken = forRun(parts, cap);
  const sent = new Set(taken.flat());
  return { parts: taken, left: todo.filter((o) => fits(o) && !sent.has(o)), tooLarge };
}

/** `bucket/key` → ETag of every object the base archives already hold. */
export type Covered = ReadonlyMap<string, string>;
export const objectId = (o: { bucket: string; key: string }): string => `${o.bucket}/${o.key}`;

/** New or changed since the base: not covered with the same ETag. */
export const isPending = (covered: Covered, o: ListedObject): boolean =>
  covered.get(objectId(o)) !== o.etag;
