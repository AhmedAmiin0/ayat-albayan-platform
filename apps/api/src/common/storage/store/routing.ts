import { storageKeyOf, storageProviderOf, type StorageProvider } from '@ab/shared';
import type { Bucket } from '@/common/storage/storage.paths';
import type { ObjectKey, ObjectStore, SlotFile } from './object-store';
import { StorageNotConfigured } from './store-source';

// StorageService's helpers (docs/45), beside it for its 150-line cap.

/** A stored path: «minio:<key>» lives in MinIO, a path without a marker in Supabase (docs/45). */
export interface ObjectRef {
  bucket: Bucket;
  path: string;
}

/** What an outside S3 writer needs (the LiveKit egress, egress-request.ts RecordingEnv). */
export interface S3Target {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secret: string;
}

export interface Upload extends ObjectRef {
  body: Uint8Array;
  contentType: string;
}
export interface Download extends ObjectRef {
  seconds?: number;
  download?: string;
}
export interface ManyPaths {
  bucket: Bucket;
  paths: readonly string[];
}
/** A client upload slot: where, and the file it admits (the route's zod schema checked both). */
export interface UploadSlot extends ObjectRef {
  file: SlotFile;
}

interface Located {
  store: ObjectStore;
  key: ObjectKey;
}

/** A copy across stores (an old Supabase file into MinIO): read it, write it with its type. */
export async function transfer(src: Located, dst: Located): Promise<void> {
  const [body, info] = await Promise.all([src.store.get(src.key), src.store.info(src.key)]);
  if (!body || !info) throw new Error('storage copy failed: source missing');
  await dst.store.put({ ...dst.key, body, contentType: info.contentType });
}

/** Tests and the copy script pass their own adapters; the app builds them from DB and config. */
export const STORE_SOURCE = Symbol('STORE_SOURCE');

/** Paths grouped by the store they live in (only the stores that have some). */
export const byProvider = (paths: readonly string[]): Map<StorageProvider, string[]> => {
  const out = new Map<StorageProvider, string[]>();
  for (const p of paths)
    out.set(storageProviderOf(p), [...(out.get(storageProviderOf(p)) ?? []), p]);
  return out;
};

/** Stored path → url, from the store's key → url; a key it could not sign is left out. */
export const urlsByPath = (
  paths: readonly string[],
  urls: Map<string, string>,
): [string, string][] =>
  paths.flatMap((path) => {
    const url = urls.get(storageKeyOf(path));
    return url ? [[path, url] as [string, string]] : [];
  });

/** The bulk copy's twin of a removed Supabase object (docs/45 §6): best effort, never fails it. */
export async function dropCopies(
  holder: ObjectStore | null,
  o: { bucket: Bucket; keys: readonly string[] },
): Promise<void> {
  await holder?.remove(o).catch(() => undefined);
}

/** A «minio:» path while MinIO is not configured holds nothing: missing (null), never a 500. */
export function missingWhenUnconfigured(e: unknown): null {
  if (e instanceof StorageNotConfigured) return null;
  throw e;
}
