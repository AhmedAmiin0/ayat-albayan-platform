import { baseMime, isChatViewMime } from '@ab/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BUCKETS, forwardOutPath } from '../../../../common/storage/storage.paths';
import { StorageService } from '../../../../common/storage/storage.service';
import { isCrmHistoryRow } from '../../whatsapp';
import { InboundMedia } from '../../whatsapp/messages/inbound-media.service';
import type { ThreadMessageRow } from '../../whatsapp/messages/message.mapper';
import { waHttpError } from '../../whatsapp/templates/catalog/template.mapper';
import { Outbox, type Sent } from '../send/outbox';
import { dedupKey, outboundBase, sendLine, type ThreadSend } from '../send/thread-send.service';
import { ThreadsQueries } from '../threads/threads.queries';

/** Our copy of a forwarded file in wa-media/out/… (the sender signs it again on every try). */
export interface ForwardFile {
  path: string;
  mime: string;
  name: string;
  caption: string | null;
}

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

  constructor(
    private readonly queries: ThreadsQueries,
    private readonly outbox: Outbox,
    private readonly storage: StorageService,
  ) {}

  /** 400 not_forwardable for a file we never had; 410 media_expired / 409 crm_no_media from the fetch. */
  async copy(row: ThreadMessageRow, at: { actorId: string; requestId: string }): Promise<ForwardFile> {
    const from = await this.source(row);
    const mime = baseMime(from.mime);
    const path = forwardOutPath({ ...at, messageId: row.id, mime });
    await this.storage.copy({ from: { bucket: BUCKETS.waMedia, path: from.path }, to: { bucket: BUCKETS.waMedia, path } });
    return { path, mime, name: fileName(row, path), caption: caption(row) };
  }

  /** One target: 409 session_closed / 503 line_not_configured as a file sent from the chat. */
  async send(s: ThreadSend<{ clientRequestId: string }>, file: ForwardFile, now = new Date()): Promise<Sent> {
    const key = dedupKey(s);
    const thread = await this.queries.thread(s.phone);
    const line = await sendLine(thread, { now, windows: () => this.queries.numberWindows(s.phone) });
    return this.outbox.send({
      ...outboundBase(s, thread),
      dedup_key: key,
      body: file.caption,
      media_path: file.path,
      media_mime: file.mime,
      media_name: file.name,
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
