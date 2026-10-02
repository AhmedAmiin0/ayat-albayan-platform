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

  /** A time-limited GET URL; `seconds` defaults to the UI lifetime (1 h). */
  async signedDownload(ref: ObjectRef & { seconds?: number }): Promise<SignedDownload> {
    const seconds = ref.seconds ?? SIGNED_URL_SECONDS.ui;
    const { data, error } = await this.db.storage.from(ref.bucket).createSignedUrl(ref.path, seconds);
    if (error) throw new Error(`storage signed url failed: ${error.message}`);
    return { url: data.signedUrl, expires_at: new Date(Date.now() + seconds * 1000).toISOString() };
  }

  /** Server-side write (the PDF job). Overwrites: a re-rendered report keeps its path. */
  async upload(ref: ObjectRef & { body: Uint8Array; contentType: string }): Promise<void> {
    const { error } = await this.db.storage
      .from(ref.bucket)
      .upload(ref.path, ref.body, { contentType: ref.contentType, upsert: true });
    if (error) throw new Error(`storage upload failed: ${error.message}`);
  }

  /** Does the object exist? (A client-registered path must have been uploaded.) */
  async exists(ref: ObjectRef): Promise<boolean> {
    const { data, error } = await this.db.storage.from(ref.bucket).exists(ref.path);
    if (error) return false;
    return data;
  }

  async remove(ref: ObjectRef): Promise<void> {
    const { error } = await this.db.storage.from(ref.bucket).remove([ref.path]);
    if (error) throw new Error(`storage remove failed: ${error.message}`);
  }
}

/** Global: reports, the PDF job and payments inject StorageService. */
@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
