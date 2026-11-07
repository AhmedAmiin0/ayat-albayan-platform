import type { StorageProvider } from '@ab/shared';
import type { MinioEnv, StorageEnv } from '@/config/env/env.storage';
import type { Bucket } from '@/common/storage/storage.paths';
import type { ObjectStore } from './object-store';

/** A MinIO read or write without a full MinIO config: an error, never a silent fallback. */
export class StorageNotConfigured extends Error {
  constructor() {
    super('storage_not_configured');
  }
}

interface Sources {
  supabase: ObjectStore;
  /** The current storage config (the integration overlay: «التكاملات» or env). */
  config: () => StorageEnv;
  minio: (m: MinioEnv) => ObjectStore;
}

/**
 * The two adapters behind StorageService: Supabase always; MinIO built from the current config and
 * rebuilt when an admin changes it (compared in memory, never logged).
 */
export class StoreSource {
  private built: { config: string; store: ObjectStore } | null = null;
  private readonly pick: Record<StorageProvider, () => ObjectStore>;

  constructor(private readonly sources: Sources) {
    this.pick = { supabase: () => sources.supabase, minio: () => this.minio() };
  }

  /** Where new objects go now (STORAGE_DRIVER). */
  active(): StorageProvider {
    return this.sources.config().driver;
  }

  store(provider: StorageProvider): ObjectStore {
    return this.pick[provider]();
  }

  /** LiveKit egress writes into MinIO: the driver is minio AND MINIO_RECORDINGS is on (docs/45). */
  recordsToMinio(): boolean {
    const c = this.sources.config();
    return c.driver === 'minio' && c.recordings;
  }

  /**
   * Where the bulk copy (docs/45 §6) may hold a second copy of this store's objects under the same
   * key: MinIO for a Supabase path once MinIO is configured; else null.
   */
  copyHolder(provider: StorageProvider): ObjectStore | null {
    const copied = provider === 'supabase' && this.sources.config().minio !== null;
    return copied ? this.minio() : null;
  }

  /** MinIO's S3 target for an outside writer (public URL: it may run off this host). */
  minioTarget(bucket: Bucket) {
    const m = this.minioEnv();
    const target = {
      endpoint: m.publicUrl,
      region: m.region,
      bucket: `${m.bucketPrefix}${bucket}`,
    };
    return { ...target, accessKey: m.accessKey, secret: m.secretKey };
  }

  private minioEnv(): MinioEnv {
    const m = this.sources.config().minio;
    if (!m) throw new StorageNotConfigured();
    return m;
  }

  private minio(): ObjectStore {
    const m = this.minioEnv();
    const config = JSON.stringify(m);
    if (this.built?.config !== config) this.built = { config, store: this.sources.minio(m) };
    return this.built.store;
  }
}
