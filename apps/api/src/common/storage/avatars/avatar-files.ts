import type { SignedUpload } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { BUCKETS } from '../storage.paths';
import { StorageService } from '../storage.service';

/** Photo URLs live for 15 minutes: the page asks again on its next load. */
const AVATAR_URL_SECONDS = 15 * 60;

/** What a photo needs from Storage (the account page, an admin's teacher / user photo, every list). */
export interface AvatarFiles {
  uploadUrl(path: string): Promise<SignedUpload>;
  info(path: string): Promise<{ size: number; contentType: string } | null>;
  head(path: string, bytes: number): Promise<Uint8Array | null>;
  /** A short-lived signed GET URL, or null when it cannot be signed (missing object). */
  url(path: string): Promise<string | null>;
  /** Many paths in ONE Storage call: path → url, an unsignable path left out. */
  urls(paths: readonly string[]): Promise<Map<string, string>>;
  remove(path: string): Promise<void>;
}

export const AVATAR_FILES = Symbol('AVATAR_FILES');

/** AvatarFiles on the private `avatars` bucket (migrations 20261012000370, 20261028000942). */
@Injectable()
export class StorageAvatarFiles implements AvatarFiles {
  constructor(private readonly storage: StorageService) {}

  uploadUrl(path: string): Promise<SignedUpload> {
    return this.storage.signedUpload({ bucket: BUCKETS.avatars, path });
  }

  info(path: string) {
    return this.storage.info({ bucket: BUCKETS.avatars, path });
  }

  head(path: string, bytes: number) {
    return this.storage.head({ bucket: BUCKETS.avatars, path }, bytes);
  }

  async url(path: string): Promise<string | null> {
    return (await this.urls([path])).get(path) ?? null;
  }

  /** A photo is a hint: a Storage failure shows initials, never takes the page down. */
  async urls(paths: readonly string[]): Promise<Map<string, string>> {
    const unique = [...new Set(paths)];
    try {
      return await this.storage.signedDownloads({ bucket: BUCKETS.avatars, paths: unique, seconds: AVATAR_URL_SECONDS });
    } catch {
      return new Map();
    }
  }

  remove(path: string): Promise<void> {
    return this.storage.remove({ bucket: BUCKETS.avatars, path });
  }
}
