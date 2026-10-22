import type { SignedDownload, SignedUpload } from '@ab/shared';
import { Global, Inject, Injectable, Module } from '@nestjs/common';
import { DB, type Db } from '../db/db.module';
import { SIGNED_URL_SECONDS, type Bucket } from './storage.paths';

export interface ObjectRef {
  bucket: Bucket;
  path: string;
}

/**
 * Supabase Storage through the service-role client (R-REP-02/03, R-PAY-01). Clients never touch
 * a bucket directly: they get a signed upload URL for one path, or a signed download URL after
 * the route's guard checked who may see the file (rule 9).
 */
@Injectable()
export class StorageService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** A one-off URL the client PUTs the file to (Storage `uploadToSignedUrl`). */
  async signedUpload(ref: ObjectRef): Promise<SignedUpload> {
    const { data, error } = await this.db.storage.from(ref.bucket).createSignedUploadUrl(ref.path);
    if (error) throw new Error(`storage signed upload failed: ${error.message}`);
    return { bucket: ref.bucket, path: data.path, token: data.token, signed_url: data.signedUrl };
  }

  /**
   * A time-limited GET URL; `seconds` defaults to the UI lifetime (1 h). `download` makes the
   * browser save it under that name (Content-Disposition) instead of the object's uuid.
   */
  async signedDownload(ref: ObjectRef & { seconds?: number; download?: string }): Promise<SignedDownload> {
    const seconds = ref.seconds ?? SIGNED_URL_SECONDS.ui;
    const { data, error } = await this.db.storage.from(ref.bucket).createSignedUrl(ref.path, seconds);
    if (error) throw new Error(`storage signed url failed: ${error.message}`);
    // Not createSignedUrl's own `download` option: supabase-js encodes it twice, and an Arabic
    // name would save as «AB-0183_…_%D8%AA….pdf». Encoded once, Storage sends filename*=UTF-8''.
    const url = ref.download ? `${data.signedUrl}&download=${encodeURIComponent(ref.download)}` : data.signedUrl;
    return { url, expires_at: new Date(Date.now() + seconds * 1000).toISOString() };
  }

  /** Server-side write (the PDF job). Overwrites: a re-rendered report keeps its path. */
  async upload(ref: ObjectRef & { body: Uint8Array; contentType: string }): Promise<void> {
    const { error } = await this.db.storage
      .from(ref.bucket)
      .upload(ref.path, ref.body, { contentType: ref.contentType, upsert: true });
    if (error) throw new Error(`storage upload failed: ${error.message}`);
  }

  /** Server-side read of a whole object (the Google sync uploads the report PDF), null when missing. */
  async download(ref: ObjectRef): Promise<Uint8Array | null> {
    const { data, error } = await this.db.storage.from(ref.bucket).download(ref.path);
    if (error) return null;
    return new Uint8Array(await data.arrayBuffer());
  }

  /** Does the object exist? (A client-registered path must have been uploaded.) */
  async exists(ref: ObjectRef): Promise<boolean> {
    const { data, error } = await this.db.storage.from(ref.bucket).exists(ref.path);
    if (error) return false;
    return data;
  }

  /** Size and content type of an object, null when it is missing. Trusts Storage, not the client. */
  async info(ref: ObjectRef): Promise<{ size: number; contentType: string } | null> {
    const { data, error } = await this.db.storage.from(ref.bucket).info(ref.path);
    if (error || !data) return null;
    return { size: data.size ?? 0, contentType: data.contentType ?? '' };
  }

  /** The first `bytes` bytes of an object (a ranged GET on a 1-minute signed URL), null when missing. */
  async head(ref: ObjectRef, bytes: number): Promise<Uint8Array | null> {
    const { data, error } = await this.db.storage.from(ref.bucket).createSignedUrl(ref.path, 60);
    if (error) return null;
    const res = await fetch(data.signedUrl, { headers: { Range: `bytes=0-${bytes - 1}` } });
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer()).slice(0, bytes);
  }

  /** Server-side copy, across buckets, never through the client. Idempotent: an existing target stays. */
  async copy(input: { from: ObjectRef; to: ObjectRef }): Promise<void> {
    const { from, to } = input;
    if (await this.exists(to)) return;
    const { error } = await this.db.storage
      .from(from.bucket)
      .copy(from.path, to.path, { destinationBucket: to.bucket });
    if (error) throw new Error(`storage copy failed: ${error.message}`);
  }

  async remove(ref: ObjectRef): Promise<void> {
    const { error } = await this.db.storage.from(ref.bucket).remove([ref.path]);
    if (error) throw new Error(`storage remove failed: ${error.message}`);
  }

  /** One Storage call for many objects of a bucket; a path that does not exist is a no-op. */
  async removeMany(input: { bucket: Bucket; paths: readonly string[] }): Promise<void> {
    if (!input.paths.length) return;
    const { error } = await this.db.storage.from(input.bucket).remove([...input.paths]);
    if (error) throw new Error(`storage remove failed: ${error.message}`);
  }
}

/** Global: reports, the PDF job and payments inject StorageService. */
@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
