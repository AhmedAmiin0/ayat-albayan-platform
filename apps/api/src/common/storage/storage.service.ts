import { storageKeyOf, storageProviderOf, storedPath, type StorageProvider } from '@ab/shared';
import type { SignedDownload, SignedUpload } from '@ab/shared';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { canFillMinioSlot } from './slots/upload-client';
import { SIGNED_URL_SECONDS, type Bucket } from './storage.paths';
import { defaultSource } from './store/default-source.supabase';
import type { ObjectKey, ObjectStore } from './store/object-store';
import { byProvider, dropCopies, missingWhenUnconfigured, STORE_SOURCE } from './store/routing';
import { transfer, urlsByPath } from './store/routing';
import type { Download, ManyPaths, ObjectRef, S3Target, Upload, UploadSlot } from './store/routing';
import type { StoreSource } from './store/store-source';

/**
 * The object-storage port's router (R-REP-02/03, R-PAY-01, docs/45; clients only get signed URLs,
 * rule 9). Reads follow the stored path's marker; every write goes to the active store
 * (STORAGE_DRIVER) and returns the path to keep, «minio:…» in MinIO.
 */
@Injectable()
export class StorageService {
  private readonly stores: StoreSource;

  constructor(@Inject(DB) db: Db, @Optional() @Inject(STORE_SOURCE) stores?: StoreSource) {
    this.stores = stores ?? defaultSource(db);
  }

  private at(ref: ObjectRef) {
    const provider = storageProviderOf(ref.path);
    const key: ObjectKey = { bucket: ref.bucket, key: storageKeyOf(ref.path) };
    return { store: this.stores.store(provider), provider, key };
  }

  /** Where a new object goes (the active store by default) and the path to keep for it. */
  private target(ref: ObjectRef, provider = this.stores.active()) {
    const key: ObjectKey = { bucket: ref.bucket, key: storageKeyOf(ref.path) };
    const path = storedPath({ provider, key: key.key });
    return { store: this.stores.store(provider), provider, key, path };
  }

  /** Never throws: a «minio:» path without a MinIO config rejects (StorageNotConfigured). */
  private async on<T>(ref: ObjectRef, read: (s: ObjectStore, key: ObjectKey) => Promise<T>) {
    const { store, key } = this.at(ref);
    return read(store, key);
  }

  writesTo(): StorageProvider {
    return this.stores.active();
  }

  /** The path a new object at this path gets now (a deterministic cache, e.g. a PDF page). */
  storedPathFor(path: string): string {
    return storedPath({ provider: this.stores.active(), key: path });
  }

  /** Recordings go into MinIO: driver minio AND MINIO_RECORDINGS on (docs/45 §1). */
  recordsToMinio(): boolean {
    return this.stores.recordsToMinio();
  }

  /** The LiveKit egress's S3 target while recordings go into MinIO; else null. */
  egressTarget(bucket: Bucket): S3Target | null {
    return this.recordsToMinio() ? this.stores.minioTarget(bucket) : null;
  }

  /**
   * A one-off URL for exactly this file; `path` is the one to send back (marked in MinIO). MinIO
   * only for a client that can fill its slot (X-AB-Upload); any other client gets Supabase's.
   */
  async signedUpload(slot: UploadSlot): Promise<SignedUpload> {
    const t = this.target(slot, canFillMinioSlot() ? this.stores.active() : 'supabase');
    const put = await t.store.signedPut({ ...t.key, file: slot.file });
    return { bucket: slot.bucket, path: t.path, token: put.token, signed_url: put.signedUrl };
  }

  /** A time-limited GET URL (default 1 h); `download` saves it under that name. */
  async signedDownload(ref: Download): Promise<SignedDownload> {
    const seconds = ref.seconds ?? SIGNED_URL_SECONDS.ui;
    const save = ref.download ? { download: ref.download } : {};
    const url = await this.on(ref, (store, key) => store.signedGet({ ...key, seconds, ...save }));
    return { url, expires_at: new Date(Date.now() + seconds * 1000).toISOString() };
  }

  /** Many GET URLs of one bucket, one call per store; an unsignable path is left out. */
  async signedDownloads(input: ManyPaths & { seconds: number }): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    for (const [provider, paths] of byProvider(input.paths)) {
      const keys = paths.map((path) => storageKeyOf(path));
      const sign = { bucket: input.bucket, keys, seconds: input.seconds };
      const urls = await this.stores.store(provider).signedGets(sign);
      for (const [path, url] of urlsByPath(paths, urls)) out.set(path, url);
    }
    return out;
  }

  /** Server-side write (overwrites); the stored path to keep. A refused write throws. */
  async upload(ref: Upload): Promise<string> {
    const t = this.target(ref);
    await t.store.put({ ...t.key, body: ref.body, contentType: ref.contentType });
    return t.path;
  }

  download(ref: ObjectRef): Promise<Uint8Array | null> {
    return this.on(ref, (store, key) => store.get(key));
  }

  /** Is a client-uploaded object there (and within its bucket's limits)? */
  exists(ref: ObjectRef): Promise<boolean> {
    return this.on(ref, (store, key) => store.exists(key)).catch(() => false);
  }

  info(ref: ObjectRef): Promise<{ size: number; contentType: string } | null> {
    return this.on(ref, (store, key) => store.info(key)).catch(missingWhenUnconfigured);
  }

  head(ref: ObjectRef, bytes: number): Promise<Uint8Array | null> {
    return this.on(ref, (store, key) => store.head(key, bytes)).catch(missingWhenUnconfigured);
  }

  /**
   * Server-side copy into the active store, never through the client; the stored target path.
   * Idempotent: an existing target stays. From an old Supabase file into MinIO: read, then write.
   */
  async copy(input: { from: ObjectRef; to: ObjectRef }): Promise<string> {
    const src = this.at(input.from);
    const dst = this.target(input.to);
    if (await dst.store.exists(dst.key)) return dst.path;
    if (src.provider === dst.provider) await dst.store.copy({ from: src.key, to: dst.key });
    else await transfer(src, dst);
    return dst.path;
  }

  /** /health: lists a prefix nothing uses in the active store; throws when it is unreachable. */
  async ping(): Promise<void> {
    await this.stores.store(this.stores.active()).list({ bucket: 'reports', prefix: '_health/' });
  }

  async remove(ref: ObjectRef): Promise<void> {
    await this.removeMany({ bucket: ref.bucket, paths: [ref.path] });
  }

  /** One call per store (a missing path is a no-op), then the bulk copy's MinIO twin if any. */
  async removeMany(input: ManyPaths): Promise<void> {
    for (const [provider, paths] of byProvider(input.paths)) {
      const keys = paths.map((p) => storageKeyOf(p));
      await this.stores.store(provider).remove({ bucket: input.bucket, keys });
      // Fire and forget: a slow MinIO never holds up a Supabase delete.
      void dropCopies(this.stores.copyHolder(provider), { bucket: input.bucket, keys });
    }
  }
}
