import {
  CHANNEL_NOT_OPEN,
  type ChannelAttachmentInput,
  type ChannelUpload,
  type SignedUpload,
} from '@ab/shared';
import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { badRequest, conflict } from '@/common/http/errors';
import {
  BUCKETS,
  isPathOf,
  SIGNED_URL_SECONDS,
  uploadName,
} from '@/common/storage/storage.paths';
import { StorageService } from '@/common/storage/storage.service';
import type { ChannelActor } from '@/modules/teaching/student-channels/channel-access';
import { ChannelRepo } from '@/modules/teaching/student-channels/channel.repo';
import { matchesUpload, type StoredObject } from './channel-upload-check';
import { orFallback } from '@/common/infra/errors';

const BUCKET = BUCKETS.channelMedia;

/** channel-media/{channel_id}/{uuid}.{ext}: one object per upload, never overwritten. */
const channelMediaPath = (input: { channelId: string; mime: string }): string =>
  `${input.channelId}/${uploadName(input.mime)}`;

/**
 * The student channel's files (docs/31 §2): a participant of an open channel gets a signed
 * upload into the channel's folder; a posted file must sit in that folder and exist (400
 * attachment_path); a page signs its files for an hour. The API is the bucket's only writer.
 */
@Injectable()
export class ChannelMedia {
  private readonly log = new Logger(ChannelMedia.name);

  constructor(
    @Inject(ChannelRepo) private readonly queries: ChannelRepo,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  /** 403 for a monitor, 409 channel_not_open while closed (as a post). */
  async uploadUrl(actor: ChannelActor, file: ChannelUpload): Promise<SignedUpload> {
    if (actor.mode !== 'participant') throw new ForbiddenException();
    if (!actor.open) throw conflict(CHANNEL_NOT_OPEN);
    const channelId = await this.queries.channelOf(actor.studentId);
    const path = channelMediaPath({ channelId, mime: file.mime });
    const slot = { size: file.size, mime: file.mime };
    return this.storage.signedUpload({ bucket: BUCKET, path, file: slot });
  }

  /**
   * The posted file, checked: this channel's folder, uploaded, and the stored object is the file
   * claimed (type, size, the type's cap, extension: matchesUpload). Else 400 attachment_path.
   */
  async verified(
    channelId: string,
    file: ChannelAttachmentInput | undefined,
  ): Promise<ChannelAttachmentInput | undefined> {
    if (!file) return undefined;
    const stored = isPathOf(file.path, channelId) ? await this.stored(file.path) : null;
    if (!matchesUpload(file, stored)) throw badRequest('attachment_path');
    return file;
  }

  /** The object's size and type; a store failure counts as not there. */
  private stored(path: string): Promise<StoredObject> {
    return orFallback(this.storage.info({ bucket: BUCKET, path }), null, 'channel media info read');
  }

  /** 1 h GET URLs by stored path; a storage failure leaves the links out (the page still loads). */
  async urls(paths: readonly string[]): Promise<Map<string, string>> {
    if (paths.length === 0) return new Map<string, string>();
    const sign = { bucket: BUCKET, paths, seconds: SIGNED_URL_SECONDS.ui };
    return this.storage.signedDownloads(sign).catch((e: unknown) => {
      this.log.warn(`channel media signing failed: ${String(e)}`);
      return new Map<string, string>();
    });
  }
}
