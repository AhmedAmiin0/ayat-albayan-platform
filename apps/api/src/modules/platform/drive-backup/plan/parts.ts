import type { ListedObject } from '@/modules/platform/drive-backup/source/backup-source.port';
import { objectCost, partCost } from './cost';

export interface Caps {
  /** Bytes per archive file (its cost on Drive, cost.ts): a larger set is split into parts. */
  part: number;
}

/** 1 GiB per part (owner 2026-11-07). */
export const DEFAULT_CAPS: Caps = { part: 1024 ** 3 };

interface PartsPlan {
  parts: ListedObject[][];
  /** Objects whose own part is above the part cap: skipped tonight, named, retried every night. */
  tooLarge: ListedObject[];
}

/** Objects read as a stream (not buffered first): each gets a part of its own (see isSolo). */
export const STREAMED_MIN = 64 * 1024 * 1024;

/** A part holding one streamed object: its failure skips that object only (one-part.ts). */
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
 * Tonight's parts: an object whose own part is above the part cap is too large (skipped, named,
 * retried every night; the others still go), the rest split in order under the part cap or
 * tonight's room when smaller (so as much as fits goes; a part above the room waits).
 */
export function planParts(
  todo: readonly ListedObject[],
  caps: Caps,
  room = Number.POSITIVE_INFINITY,
): PartsPlan {
  const fits = (o: ListedObject) => partCost([o]) <= caps.part;
  const limit = Math.min(caps.part, room);
  return { parts: split(todo.filter(fits), limit), tooLarge: todo.filter((o) => !fits(o)) };
}

export const objectId = (o: { bucket: string; key: string }): string => `${o.bucket}/${o.key}`;

/** One version of one object: what drive_backup_objects records once its part is on Drive. */
export const versionId = (o: { bucket: string; key: string; etag: string }): string =>
  `${objectId(o)}\n${o.etag}`;

/** Not backed up yet: this (bucket, key, ETag) is not recorded. */
export const isPending = (covered: ReadonlySet<string>, o: ListedObject): boolean =>
  !covered.has(versionId(o));
