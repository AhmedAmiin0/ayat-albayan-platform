// Where a stored file lives (owner 2026-11-06: MinIO keeps every new file; old ones stay in
// Supabase Storage). The provider is a marker at the front of the path the database keeps:
// «minio:<key>» is in MinIO, a path with no marker is in Supabase (every row written before the
// switch). The API reads by the marker; the web and mobile apps upload by it (docs/45).

export const STORAGE_PROVIDERS = ['supabase', 'minio'] as const;
export type StorageProvider = (typeof STORAGE_PROVIDERS)[number];

/** The marker of a MinIO object's path. Supabase paths carry none (never a colon in a key). */
export const MINIO_MARK = 'minio:';

const MARKS: Record<StorageProvider, string> = { supabase: '', minio: MINIO_MARK };

/** The provider a stored path names: «minio:…» → minio, anything else → supabase. */
export function storageProviderOf(path: string): StorageProvider {
  return path.startsWith(MINIO_MARK) ? 'minio' : 'supabase';
}

/** The object key inside its bucket: the stored path without its marker. */
export function storageKeyOf(path: string): string {
  return path.slice(MARKS[storageProviderOf(path)].length);
}

/** The path to store for this key in this provider (the key itself for Supabase). */
export function storedPath(input: { provider: StorageProvider; key: string }): string {
  return `${MARKS[input.provider]}${storageKeyOf(input.key)}`;
}
