import { baseMime, chatFileProblem, uploadMaxBytes, type SignedUpload, type SavedReplyStaged, type SavedReplyUpload } from '@ab/shared';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BUCKETS, chatOutPath } from '../../../common/storage/storage.paths';
import { StorageService } from '../../../common/storage/storage.service';
import { sniffMime, SNIFF_BYTES } from '../../teaching/booking/invoice/invoice-sniff';
import { waHttpError } from '../whatsapp/templates/catalog/template.mapper';
import { isSavedReplyPathOf, savedReplyPath } from './saved-replies.paths';
import { SavedReplySettings } from './saved-replies.settings';

/** What Storage holds for an uploaded attachment: the columns saved_replies keeps. */
export interface StoredFile {
  path: string;
  mime: string;
  size: number;
}

/** 400 file_type / 413 file_too_large: the chat's own limits (JPEG/PNG ≤ 5 MB, PDF ≤ upload_max_mb). */
function assertSendable(f: { mime: string; size: number; maxBytes: number }): void {
  const problem = chatFileProblem(f);
  if (problem === 'file_type') throw waHttpError('file_type', HttpStatus.BAD_REQUEST);
  if (problem) throw waHttpError(problem, HttpStatus.PAYLOAD_TOO_LARGE);
}

const filePath = () => waHttpError('file_path', HttpStatus.BAD_REQUEST);
const ref = (path: string) => ({ bucket: BUCKETS.waMedia, path });

/**
 * A saved reply's image or PDF in wa-media (the chat attachments' bucket): signed upload, checked
 * like a chat file (Storage's own type and size, then the first bytes), removed with its reply, and
 * copied as the sender's chat file when the composer sends it.
 */
@Injectable()
export class SavedReplyFiles {
  private readonly log = new Logger(SavedReplyFiles.name);

  constructor(
    private readonly storage: StorageService,
    private readonly settings: SavedReplySettings,
  ) {}

  async uploadUrl(actorId: string, input: SavedReplyUpload): Promise<SignedUpload> {
    assertSendable({ mime: input.mime, size: input.size, maxBytes: await this.maxBytes() });
    return this.storage.signedUpload(ref(savedReplyPath({ actorId, mime: input.mime })));
  }

  /** The uploaded object, if it is this actor's and really a JPEG, PNG or PDF within the limits. */
  async verify(path: string, actorId: string): Promise<StoredFile> {
    if (!isSavedReplyPathOf(path, actorId)) throw filePath();
    const info = await this.storage.info(ref(path));
    if (!info) throw filePath();
    const mime = baseMime(info.contentType);
    assertSendable({ mime, size: info.size, maxBytes: await this.maxBytes() });
    const head = await this.storage.head(ref(path), SNIFF_BYTES);
    if (!head || sniffMime(head) !== mime) throw waHttpError('file_type', HttpStatus.BAD_REQUEST);
    return { path, mime, size: info.size };
  }

  /** Best effort: the reply is already gone or changed; a stale object must not fail the request. */
  async remove(path: string | null): Promise<void> {
    if (!path) return;
    try {
      await this.storage.remove(ref(path));
    } catch (e) {
      this.log.warn(`saved reply attachment ${path} not removed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Copied to out/{sender}/{request}/: POST /threads/:phone/file then sends it with every chat check. */
  async stage(input: { file: StoredFile; name: string; actorId: string; requestId: string }): Promise<SavedReplyStaged> {
    const to = chatOutPath({ actorId: input.actorId, requestId: input.requestId, mime: input.file.mime });
    await this.storage.copy({ from: ref(input.file.path), to: ref(to) });
    return { path: to, filename: input.name };
  }

  private async maxBytes(): Promise<number> {
    return uploadMaxBytes(await this.settings.read());
  }
}
