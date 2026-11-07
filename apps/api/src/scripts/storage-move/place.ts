import { createHash } from 'node:crypto';
import type { ObjectInfo, ObjectKey, ObjectStore } from '@/common/storage/store/object-store';
import { putAbsent } from '@/scripts/storage-copy.plan';

// One object of a row into MinIO under the same key, then checked (docs/45 §6). Only an object
// that is really in MinIO, byte for byte, lets the row be rewritten.

export interface Stores {
  from: ObjectStore;
  to: ObjectStore;
  /** Larger objects are left alone (each one is held in memory twice; the VPS is shared). */
  maxBytes: number;
}

/** copied / present = in MinIO and verified; anything else = the row must keep its path. */
export type Placed = 'copied' | 'present' | 'missing' | 'mismatch' | 'too_large';

interface Source {
  info: ObjectInfo;
  body: Uint8Array;
}

const sha256 = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');

/**
 * Size and Content-Type as each store reports them, and a SHA-256 of the bytes read back from
 * MinIO against the bytes read from Supabase (neither store gives a comparable checksum: ETags
 * differ by upload kind, so both sides are hashed here).
 */
async function sameInMinio(to: ObjectStore, o: ObjectKey, src: Source): Promise<boolean> {
  const [dst, back] = await Promise.all([to.info(o), to.get(o)]);
  const checks = [
    dst?.size === src.info.size,
    dst?.contentType === src.info.contentType,
    back?.byteLength === src.body.byteLength,
    src.body.byteLength === src.info.size,
    sha256(back ?? new Uint8Array()) === sha256(src.body),
  ];
  return checks.every(Boolean);
}

const tooLarge = (info: ObjectInfo, stores: Stores): boolean => info.size > stores.maxBytes;

async function source(stores: Stores, o: ObjectKey): Promise<Source | Placed> {
  const info = await stores.from.info(o);
  if (!info) return 'missing';
  if (tooLarge(info, stores)) return 'too_large';
  const body = await stores.from.get(o);
  return body ? { info, body } : 'missing';
}

const isPlaced = (s: Source | Placed): s is Placed => typeof s === 'string';

/**
 * Copies (never over an object MinIO already holds: a newer re-render keeps its bytes and then
 * fails the check) and verifies. A missing source is reported, never invented.
 */
export async function placeInMinio(stores: Stores, o: ObjectKey): Promise<Placed> {
  const src = await source(stores, o);
  if (isPlaced(src)) return src;
  const copy = { ...o, body: src.body, contentType: src.info.contentType };
  const put = await putAbsent(stores.to, copy);
  return (await sameInMinio(stores.to, o, src)) ? put : 'mismatch';
}
