import type { Bucket } from '@/common/storage/storage.paths';

// The object-storage port (docs/45): one interface, two adapters (objects.supabase.ts: today's
// Supabase Storage; s3-store.ts: MinIO through the S3 API). Keys are bare object keys: the
// «minio:» marker of a stored path is the router's business (StorageService), never an adapter's.

export interface ObjectKey {
  bucket: Bucket;
  key: string;
}

export interface PutObject extends ObjectKey {
  body: Uint8Array;
  contentType: string;
}

export interface ObjectInfo {
  size: number;
  contentType: string;
}

export interface SignedGet extends ObjectKey {
  seconds: number;
  /** Save-as name (Content-Disposition attachment; filename*=UTF-8''…). */
  download?: string;
}

export interface SignedPut {
  /** Supabase's upload token (uploadToSignedUrl); empty for a plain PUT URL. */
  token: string;
  signedUrl: string;
}

export interface ObjectStore {
  /** Writes (overwrites) an object; throws when the store refused it. */
  put(o: PutObject): Promise<void>;
  /** The whole object, null when missing. */
  get(o: ObjectKey): Promise<Uint8Array | null>;
  /** Its first `bytes` bytes, null when missing. */
  head(o: ObjectKey, bytes: number): Promise<Uint8Array | null>;
  info(o: ObjectKey): Promise<ObjectInfo | null>;
  /** Present and within the bucket's limits (a client upload is checked through this). */
  exists(o: ObjectKey): Promise<boolean>;
  /** Removes these keys of one bucket; a missing key is a no-op. */
  remove(input: { bucket: Bucket; keys: readonly string[] }): Promise<void>;
  /** Every key under a prefix (recursive). */
  list(input: { bucket: Bucket; prefix: string }): Promise<string[]>;
  /** Server-side copy inside this store. */
  copy(input: { from: ObjectKey; to: ObjectKey }): Promise<void>;
  signedGet(o: SignedGet): Promise<string>;
  /** key → url; a key the store cannot sign is left out. */
  signedGets(input: {
    bucket: Bucket;
    keys: readonly string[];
    seconds: number;
  }): Promise<Map<string, string>>;
  signedPut(o: ObjectKey): Promise<SignedPut>;
}
