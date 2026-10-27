import {
  baseMime,
  chatFileProblem,
  SETTING_DEFAULTS,
  uploadMaxBytes,
  type SignedUpload,
  type ThreadFileSendInput,
  type ThreadFileUpload,
} from '@ab/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BUCKETS, chatOutPath, isChatOutPathOf } from '../../../../common/storage/storage.paths';
import { StorageService } from '../../../../common/storage/storage.service';
import { sniffMime, SNIFF_BYTES } from '../../../teaching/booking/invoice/invoice-sniff';
import { waHttpError } from '../../whatsapp/templates/catalog/template.mapper';
import { InboxSettings } from '../inbox.settings';
import { Outbox, type Sent } from '../send/outbox';
import { ThreadQuotes } from '../threads/thread-quotes';
import { dedupKey, outboundBase, replyOf, sendLine, type ThreadSend } from '../send/thread-send.service';
import { ThreadsQueries } from '../threads/threads.queries';

/** 400 file_type / 413 file_too_large, or nothing. */
function assertSendable(f: { mime: string; size: number; maxBytes: number }): void {
  const problem = chatFileProblem(f);
  if (problem === 'file_type') throw waHttpError('file_type', HttpStatus.BAD_REQUEST);
  if (problem) throw waHttpError(problem, HttpStatus.PAYLOAD_TOO_LARGE);
}

/** A PDF reaches the family named .pdf whatever the client called it (the bytes were sniffed as PDF). */
export const sentFileName = (name: string, mime: string): string =>
  mime !== 'application/pdf' || /\.pdf$/i.test(name) ? name : `${name.slice(0, 196)}.pdf`;

const filePath = () => waHttpError('file_path', HttpStatus.BAD_REQUEST);

/**
 * Owner 2026-10-19 #2: staff send a JPEG/PNG image or a PDF from the chat, inside the 24 h window,
 * stored in wa-media at out/{actor}/{client_request_id}/{uuid}.{ext} and logged under their name
 * (created_by). The browser uploads to a signed URL; the send trusts only what Storage holds.
 */
@Injectable()
export class ThreadFileSender {
  /** Property-injected (the constructor is at the 3-parameter limit); absent → the registry default. */
  @Inject(InboxSettings) private readonly settings?: InboxSettings;
  /** «رد» on a file (owner 2026-10-25), property-injected like settings. */
  @Inject(ThreadQuotes) private readonly quotes?: ThreadQuotes;

  constructor(
    private readonly queries: ThreadsQueries,
    private readonly outbox: Outbox,
    private readonly storage: StorageService,
  ) {}

  /**
   * A signed upload URL for one file of this actor and request id; type and size checked first, then
   * the 24 h window and line as send() does, so a closed or unknown chat stores nothing it cannot send.
   */
  async uploadUrl(s: ThreadSend<ThreadFileUpload>, now = new Date()): Promise<SignedUpload> {
    assertSendable({ mime: s.input.mime, size: s.input.size, maxBytes: await this.maxBytes() });
    await sendLine(await this.queries.thread(s.phone), { now, windows: () => this.queries.numberWindows(s.phone) });
    const path = chatOutPath({ actorId: s.actorId, requestId: s.input.clientRequestId, mime: s.input.mime });
    return this.storage.signedUpload({ bucket: BUCKETS.waMedia, path });
  }

  /**
   * Queue the uploaded file, strictly in this order: the request id (400), the 24 h window and the
   * line (409 session_closed / 503, before any Storage call), the path is this actor's and this
   * request's (400 file_path), Storage's own type and size, then the first bytes must be that type.
   * A replayed request id returns the first row (the namespace is shared with text sends).
   */
  async send(s: ThreadSend<ThreadFileSendInput>, now = new Date()): Promise<Sent> {
    const key = dedupKey(s);
    const thread = await this.queries.thread(s.phone);
    const line = await sendLine(thread, { now, windows: () => this.queries.numberWindows(s.phone) });
    const { path, clientRequestId, filename, caption } = s.input;
    if (!isChatOutPathOf(path, { actorId: s.actorId, requestId: clientRequestId })) throw filePath();
    const ref = { bucket: BUCKETS.waMedia, path };
    const info = await this.storage.info(ref);
    if (!info) throw filePath();
    const mime = baseMime(info.contentType);
    assertSendable({ mime, size: info.size, maxBytes: await this.maxBytes() });
    const head = await this.storage.head(ref, SNIFF_BYTES);
    if (!head) throw filePath();
    if (sniffMime(head) !== mime) throw waHttpError('file_type', HttpStatus.BAD_REQUEST);
    const reply = await replyOf(this.quotes, s, line);
    return this.outbox.queue({
      ...outboundBase(s, thread),
      dedup_key: key,
      body: caption || null,
      media_path: path,
      media_mime: mime,
      media_name: sentFileName(filename, mime),
      ...line,
      ...reply,
    });
  }

  private async maxBytes(): Promise<number> {
    return uploadMaxBytes(this.settings ? await this.settings.read() : SETTING_DEFAULTS);
  }
}
