import type { Json } from '@ab/db';
import { baseMime, isChatViewMime, isStickerMessage, stickerPayloadOf } from '@ab/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BUCKETS, forwardOutPath } from '@/common/storage/storage.paths';
import { StorageService } from '@/common/storage/storage.service';
import { isCrmHistoryRow } from '@/modules/messaging/whatsapp';
import { InboundMedia } from '@/modules/messaging/whatsapp/messages/inbound-media.service';
import type { ThreadMessageRow } from '@/modules/messaging/whatsapp/messages/message.mapper';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { Outbox, type Sent } from '@/modules/messaging/inbox/send/outbox';
import { chatLine, dedupKey, outboundBase, type ThreadSend } from '@/modules/messaging/inbox/send/thread-send.service';
import { KapsoReopener } from '@/modules/messaging/inbox/reopen/kapso-reopener';
import { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';

/** Our copy of a forwarded file in wa-media/out/… (the sender signs it again on every try). */
export interface ForwardFile {
  path: string;
  mime: string;
  name: string;
  caption: string | null;
  /** The copy's interactive_payload: a sticker keeps its sha256 (owner 2026-11-01). */
  payload?: Json;
}

/** A sticker's copy keeps its sha256, so the panel lists it once (owner 2026-11-01). */
const stickerOf = (row: ThreadMessageRow): { payload?: Json } =>
  isStickerMessage(row) ? { payload: stickerPayloadOf(row.interactive_payload) } : {};

const notForwardable = () => waHttpError('not_forwardable', HttpStatus.BAD_REQUEST);

/** The name a forwarded file reaches the family with: ours as sent, else the copy's own (fwd-….ext). */
const fileName = (row: ThreadMessageRow, path: string): string => row.media_name ?? path.split('/').at(-1) ?? 'file';

/**
 * The caption it goes with; an echo's type marker («[video]», webhook external-row) is no caption, nor
 * an old-CRM file's body (only its storage link, owner 2026-10-27).
 */
const caption = (row: ThreadMessageRow): string | null => {
  const text = isCrmHistoryRow(row) ? null : row.body?.trim() || null;
  return row.direction === 'outbound' && row.media_id && text && /^\[[a-z_]+\]$/.test(text) ? null : text;
};

/**
 * «إعادة توجيه» of a file (owner 2026-10-25): the staff member never uploads it again. Ours (out/…),
 * theirs or an echo of the WhatsApp Business app (cached from WhatsApp first, as the bubble does) is copied once per forward to
 * out/{actor}/{request}/fwd-{message}.{ext}; each target then queues that path through the same
 * window and line checks as a file sent from the chat (thread-file-send.service.ts).
 */
@Injectable()
export class ForwardFiles {
  /** Property-injected (the constructor is at the 3-parameter limit). */
  @Inject(InboundMedia) private readonly inbound?: InboundMedia;
  /** Kapso's conversation record, for a copy tried after the window as a text is (chatLine). */
  @Inject(KapsoReopener) private readonly kapso?: KapsoReopener;

  constructor(
    private readonly queries: ThreadsRepo,
    private readonly outbox: Outbox,
    private readonly storage: StorageService,
  ) {}

  /** 400 not_forwardable for a file we never had; 410 media_expired / 409 crm_no_media from the fetch. */
  async copy(row: ThreadMessageRow, at: { actorId: string; requestId: string }): Promise<ForwardFile> {
    const from = await this.source(row);
    const mime = baseMime(from.mime);
    const path = forwardOutPath({ ...at, messageId: row.id, mime });
    await this.storage.copy({ from: { bucket: BUCKETS.waMedia, path: from.path }, to: { bucket: BUCKETS.waMedia, path } });
    return { path, mime, name: fileName(row, path), caption: caption(row), ...stickerOf(row) };
  }

  /** One target, on a text's line (chatLine: 409 session_closed / 503 line_not_configured). */
  async send(s: ThreadSend<{ clientRequestId: string }>, file: ForwardFile, now = new Date()): Promise<Sent> {
    const key = dedupKey(s);
    const thread = await this.queries.thread(s.phone);
    const windows = () => this.queries.numberWindows(s.phone);
    const line = await chatLine(thread, { now, windows, phone: s.phone, kapso: this.kapso, teacher: !!s.scope });
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

  /** Ours as sent (out/…); else theirs or an echo of the WhatsApp Business app (Meta's media id), cached first. */
  private async source(row: ThreadMessageRow): Promise<{ path: string; mime: string | null }> {
    if (row.direction === 'outbound' && row.media_path?.startsWith('out/')) return { path: row.media_path, mime: row.media_mime };
    if (row.direction === 'outbound' && (!row.media_id || !isChatViewMime(row.media_mime))) throw notForwardable();
    if (!this.inbound) throw new Error('InboundMedia is not provided');
    const file = await this.inbound.cache(await this.inbound.loadChat(row.id));
    return { path: file.path, mime: file.mime };
  }
}
