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

/** Why an object is never sent tonight: larger than Drive's room, or than the night's cap. */
export type TooLargeWhy = 'room' | 'night';
export interface TooLarge {
  object: ListedObject;
  why: TooLargeWhy;
}

interface PartsPlan {
  parts: ListedObject[][];
  /** Objects left for the next run (the run's byte cap), in order. */
  left: ListedObject[];
  /** Objects whose own part is above the room or the night's cap: skipped, named in the alert. */
  tooLarge: TooLarge[];
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

/** The parts the night's cap takes, in order: one that does not fit is passed over (continue). */
function forRun(parts: readonly ListedObject[][], cap: number): ListedObject[][] {
  const taken: ListedObject[][] = [];
  let spent = 0;
  for (const p of parts) {
    const cost = partCost(p);
    if (spent + cost > cap) continue;
    spent += cost;
    taken.push(p);
  }
  return taken;
}

const whyOf = (o: ListedObject, room: number): TooLargeWhy =>
  partCost([o]) > room ? 'room' : 'night';

/**
 * Tonight's parts: an object whose own part is above the room or the night's cap is too large
 * (skipped, never sent, named in the alert; the later ones still go), the rest split under the
 * part cap and taken up to the night's cap; a part over what is left waits, the smaller ones after
 * it still go. Every part planned fits the room and the cap it was planned for.
 */
export function planParts(
  todo: readonly ListedObject[],
  caps: Caps,
  room = Number.POSITIVE_INFINITY,
): PartsPlan {
  const cap = Math.min(caps.run, room);
  const fits = (o: ListedObject) => partCost([o]) <= cap;
  const tooLarge = todo.filter((o) => !fits(o)).map((o) => ({ object: o, why: whyOf(o, room) }));
  const taken = forRun(split(todo.filter(fits), Math.min(caps.part, cap)), cap);
  const sent = new Set(taken.flat());
  return { parts: taken, left: todo.filter((o) => fits(o) && !sent.has(o)), tooLarge };
}

/** `bucket/key` → ETag of every object the base archives already hold. */
export type Covered = ReadonlyMap<string, string>;
export const objectId = (o: { bucket: string; key: string }): string => `${o.bucket}/${o.key}`;

/** New or changed since the base: not covered with the same ETag. */
export const isPending = (covered: Covered, o: ListedObject): boolean =>
  covered.get(objectId(o)) !== o.etag;
