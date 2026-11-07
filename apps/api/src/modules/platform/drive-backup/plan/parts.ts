import type { ListedObject } from '@/modules/platform/drive-backup/source/backup-source.port';

export interface Caps {
  /** Raw bytes per archive file: a larger set is split into parts. */
  part: number;
  /** Raw bytes per run (the VPS's uplink and CPU): the rest waits for the next night. */
  run: number;
}

/** 1 GiB raw per part, 4 GiB raw per night (the server also runs the live CRM). */
export const DEFAULT_CAPS: Caps = { part: 1024 ** 3, run: 4 * 1024 ** 3 };

export interface PartsPlan {
  parts: ListedObject[][];
  /** Objects left for the next run (the run's byte cap). */
  left: number;
}

/** The objects of this run, in order, up to the run's cap (at least one). */
function forRun(todo: readonly ListedObject[], cap: number): ListedObject[] {
  const taken: ListedObject[] = [];
  let bytes = 0;
  for (const o of todo) {
    if (bytes > 0 && bytes + o.size > cap) break;
    taken.push(o);
    bytes += o.size;
  }
  return taken;
}

/** Splits the objects to archive into parts, in order; one object always fits (even a big one). */
export function planParts(todo: readonly ListedObject[], caps: Caps): PartsPlan {
  const taken = forRun(todo, caps.run);
  const parts: ListedObject[][] = [];
  let current: ListedObject[] = [];
  let bytes = 0;
  for (const o of taken) {
    if (current.length > 0 && bytes + o.size > caps.part) {
      parts.push(current);
      current = [];
      bytes = 0;
    }
    current.push(o);
    bytes += o.size;
  }
  if (current.length > 0) parts.push(current);
  return { parts, left: todo.length - taken.length };
}

/** `bucket/key` → ETag of every object the base archives already hold. */
export type Covered = ReadonlyMap<string, string>;
export const objectId = (o: { bucket: string; key: string }): string => `${o.bucket}/${o.key}`;

/** New or changed since the base: not covered with the same ETag. */
export const isPending = (covered: Covered, o: ListedObject): boolean =>
  covered.get(objectId(o)) !== o.etag;
