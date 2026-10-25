import { baseMime, isChatViewMime } from '@ab/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BUCKETS, forwardOutPath } from '../../common/storage/storage.paths';
import { StorageService } from '../../common/storage/storage.service';
import { InboundMedia } from '../whatsapp/messages/inbound-media.service';
import type { ThreadMessageRow } from '../whatsapp/messages/message.mapper';
import { waHttpError } from '../whatsapp/template.mapper';
import { Outbox, type Sent } from './outbox';
import { dedupKey, outboundBase, sendLine, type ThreadSend } from './thread-send.service';
import { ThreadsQueries } from './threads.queries';

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
 * «إعادة توجيه» of a file (owner 2026-10-25): the staff member never uploads it again. Ours (out/…) or
 * theirs (cached from WhatsApp first, as the bubble does) is copied once per forward to
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
    return { path, mime, name: fileName(row, path), caption: row.body?.trim() || null };
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

  private async source(row: ThreadMessageRow): Promise<{ path: string; mime: string | null }> {
    if (row.direction === 'outbound') {
      if (!row.media_path?.startsWith('out/')) throw notForwardable();
      return { path: row.media_path, mime: row.media_mime };
    }
    if (!this.inbound) throw new Error('InboundMedia is not provided');
    const file = await this.inbound.cache(await this.inbound.load(row.id, isChatViewMime));
    return { path: file.path, mime: file.mime };
  }
}
