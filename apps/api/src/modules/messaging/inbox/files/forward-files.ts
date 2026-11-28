import type { Json } from '@ab/db';
import { baseMime, isChatViewMime, isStickerMessage, stickerPayloadOf, storageKeyOf } from '@ab/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BUCKETS, forwardOutPath, isSentFilePath } from '@/common/storage/storage.paths';
import { StorageService } from '@/common/storage/storage.service';
import {
  InboundMedia,
  isCrmHistoryRow,
  type ThreadMessageRow,
} from '@/modules/messaging/whatsapp';
import { Outbox, type Sent } from '@/modules/messaging/inbox/send/outbox';
import {
  chatLine,
  dedupKey,
  outboundBase,
  type ThreadSend,
} from '@/modules/messaging/inbox/send/thread-send.service';
import { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';
import { httpError } from '@/common/http/errors';

/** Our copy of a forwarded file in wa-media/out/… (the sender signs it again on every try). */
export interface ForwardFile {
  path: string;
  mime: string;
  name: string;
  caption: string | null;
  /** The copy's interactive_payload: a sticker keeps its sha256. */
  payload?: Json;
}

/** A sticker's copy keeps its sha256, so the panel lists it once. */
const stickerOf = (row: ThreadMessageRow): { payload?: Json } =>
  isStickerMessage(row) ? { payload: stickerPayloadOf(row.interactive_payload) } : {};

const notForwardable = () => httpError(HttpStatus.BAD_REQUEST, 'not_forwardable');

/**
 * The name a forwarded file reaches the family with: ours as sent, else the copy's own (fwd-….ext).
 */
const fileName = (row: ThreadMessageRow, path: string): string =>
  row.media_name ?? storageKeyOf(path).split('/').at(-1) ?? 'file';

/**
 * The caption it goes with; an echo's type marker («[video]», webhook external-row) is no caption,
 * nor an old-CRM file's body (only its storage link).
 */
const caption = (row: ThreadMessageRow): string | null => {
  const text = captionText(row);
  return text !== null && isEchoMarker(row, text) ? null : text;
};

const captionText = (row: ThreadMessageRow): string | null =>
  isCrmHistoryRow(row) ? null : row.body?.trim() || null;

const ECHO_MARKER = /^\[[a-z_]+\]$/;

const isEchoMarker = (row: ThreadMessageRow, text: string): boolean =>
  row.direction === 'outbound' && Boolean(row.media_id) && ECHO_MARKER.test(text);

/** Ours as sent: its out/… path; null for any other row. */
const sentPath = (row: ThreadMessageRow): string | null =>
  row.direction === 'outbound' && row.media_path && isSentFilePath(row.media_path)
    ? row.media_path
    : null;

/** An outbound row with no Meta media id, or one the chat cannot show, was never ours to copy. */
const unforwardableEcho = (row: ThreadMessageRow): boolean =>
  row.direction === 'outbound' && (!row.media_id || !isChatViewMime(row.media_mime));

/** Copied once per forward; each target sends through the normal window and line checks. */
@Injectable()
export class ForwardFiles {
  /** Property-injected (the constructor is at the 3-parameter limit). */
  @Inject(InboundMedia) private readonly inbound?: InboundMedia;

  constructor(
    private readonly queries: ThreadsRepo,
    private readonly outbox: Outbox,
    private readonly storage: StorageService,
  ) {}

  /**
   * 400 not_forwardable for a file we never had; 410 media_expired / 409 crm_no_media from the
   * fetch.
   */
  async copy(
    row: ThreadMessageRow,
    at: { actorId: string; requestId: string },
  ): Promise<ForwardFile> {
    const from = await this.source(row);
    const mime = baseMime(from.mime);
    const key = forwardOutPath({ ...at, messageId: row.id, mime });
    const to = { bucket: BUCKETS.waMedia, path: key };
    const path = await this.storage.copy({
      from: { bucket: BUCKETS.waMedia, path: from.path },
      to,
    });
    return { path, mime, name: fileName(row, path), caption: caption(row), ...stickerOf(row) };
  }

  /** One target, on a text's line (chatLine: 409 session_closed / 503 line_not_configured). */
  async send(
    s: ThreadSend<{ clientRequestId: string }>,
    file: ForwardFile,
    now = new Date(),
  ): Promise<Sent> {
    const key = dedupKey(s);
    const thread = await this.queries.thread(s.phone);
    const windows = () => this.queries.numberWindows(s.phone);
    const line = await chatLine(thread, { now, windows, teacher: !!s.scope });
    return this.outbox.queue({
      ...outboundBase(s, thread),
      dedup_key: key,
      body: file.caption,
      media_path: file.path,
      media_mime: file.mime,
      media_name: file.name,
      ...(file.payload === undefined ? {} : { interactive_payload: file.payload }),
      ...line,
    });
  }

  /**
   * Ours as sent (out/…); else theirs or an echo of the WhatsApp Business app (Meta's media id),
   * cached first.
   */
  private async source(row: ThreadMessageRow): Promise<{ path: string; mime: string | null }> {
    const sent = sentPath(row);
    if (sent) return { path: sent, mime: row.media_mime };
    if (unforwardableEcho(row)) throw notForwardable();
    if (!this.inbound) throw new Error('InboundMedia is not provided');
    const file = await this.inbound.cache(await this.inbound.loadChat(row.id));
    return { path: file.path, mime: file.mime };
  }
}
