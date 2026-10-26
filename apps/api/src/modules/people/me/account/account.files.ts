import type { SignedUpload } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { BUCKETS } from '../../../../common/storage/storage.paths';
import { StorageService } from '../../../../common/storage/storage.service';
import type { AccountFiles } from './account.ports';

/** Avatar URLs live for 15 minutes: the page asks again on its next load. */
const AVATAR_URL_SECONDS = 15 * 60;

/** AccountFiles on the private `avatars` bucket (migration 20261012000370, R-ACC-05). */
@Injectable()
export class StorageAccountFiles implements AccountFiles {
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
    try {
      const signed = await this.storage.signedDownload({ bucket: BUCKETS.avatars, path, seconds: AVATAR_URL_SECONDS });
      return signed.url;
    } catch {
      return null;
    }
  }

  remove(path: string): Promise<void> {
    return this.storage.remove({ bucket: BUCKETS.avatars, path });
  }
}
