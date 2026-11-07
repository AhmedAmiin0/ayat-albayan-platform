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
  /** Objects left for the next run (the run's byte cap). */
  left: number;
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

/** How many parts, in order, the night's cap takes (the first always: it fits the room). */
function forRun(parts: readonly ListedObject[][], cap: number): number {
  let spent = 0;
  let n = 0;
  for (const p of parts) {
    const cost = partCost(p);
    if (n > 0 && spent + cost > cap) break;
    spent += cost;
    n += 1;
  }
  return n;
}

const count = (parts: readonly ListedObject[][]): number => parts.reduce((n, p) => n + p.length, 0);

/**
 * Tonight's parts: an object larger than the room on its own is skipped (not the night's end: the
 * later ones still go), the rest split under the part cap and the room, then taken in order up to
 * the run's cap. Every part planned fits the room it was planned for.
 */
export function planParts(
  todo: readonly ListedObject[],
  caps: Caps,
  room = Number.POSITIVE_INFINITY,
): PartsPlan {
  const fits = (o: ListedObject) => partCost([o]) <= room;
  const tooLarge = todo.filter((o) => !fits(o));
  const parts = split(todo.filter(fits), Math.min(caps.part, room));
  const taken = parts.slice(0, forRun(parts, Math.min(caps.run, room)));
  return { parts: taken, left: todo.length - tooLarge.length - count(taken), tooLarge };
}

/** `bucket/key` → ETag of every object the base archives already hold. */
export type Covered = ReadonlyMap<string, string>;
export const objectId = (o: { bucket: string; key: string }): string => `${o.bucket}/${o.key}`;

/** New or changed since the base: not covered with the same ETag. */
export const isPending = (covered: Covered, o: ListedObject): boolean =>
  covered.get(objectId(o)) !== o.etag;
