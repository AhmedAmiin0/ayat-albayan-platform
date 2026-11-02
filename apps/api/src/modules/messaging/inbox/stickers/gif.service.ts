import type { GifList, ThreadGifSend } from '@ab/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { FetchLike } from '@/common/infra/http/failure';
import { BUCKETS } from '@/common/storage/storage.paths';
import { StorageService } from '@/common/storage/storage.service';
import { loadEnv } from '@/config/env/env';
import { waHttpError } from '@/modules/messaging/whatsapp';
import { Outbox, type Sent } from '@/modules/messaging/inbox/send/outbox';
import {
  dedupKey,
  chatLine,
  outboundBase,
  type ThreadSend,
} from '@/modules/messaging/inbox/send/thread-send.service';
import { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';
import { KapsoReopener } from '@/modules/messaging/inbox/reopen/kapso-reopener';
import { Giphy } from './giphy';

const GIF_MIME = 'video/mp4';

/** The copy's fixed name: a retried request writes the same object again (upsert). */
export const gifPath = (s: { actorId: string; requestId: string }): string =>
  `out/${s.actorId}/${s.requestId}/gif.mp4`;

/**
 * The GIF tab (owner 2026-11-01): GIPHY's search or trending GIFs, and a GIF sent as WhatsApp's
 * `video` (WhatsApp has no GIF type). Its mp4 is fetched by the API (the app only names GIPHY's
 * id), kept in wa-media/out/… and queued as this staff member's message with `{ type: 'gif' }`,
 * so the bubbles play it muted and looping. The key is read per call («التكاملات» › GIPHY):
 * without it the list says so (`configured: false`) and a send is 503 giphy_not_configured.
 */
@Injectable()
export class GifService {
  /** Test seam: GIPHY's transport (unset = the http client's global fetch). */
  fetch?: FetchLike;
  /** GIPHY_API_KEY of «التكاملات» (env the fallback); tests swap it. */
  key = (): string | undefined => loadEnv().GIPHY_API_KEY;
  /** Kapso's conversation record, for a GIF tried after the window as a text is (chatLine). */
  @Inject(KapsoReopener) private readonly kapso?: KapsoReopener;

  constructor(
    private readonly threads: ThreadsRepo,
    private readonly outbox: Outbox,
    private readonly storage: StorageService,
  ) {}

  async list(q: string | undefined): Promise<GifList> {
    const giphy = this.giphy();
    if (!giphy) return { configured: false, items: [] };
    return { configured: true, items: await giphy.list(q) };
  }

  /** The line first, as a text's (chatLine: 409 / 503), then GIPHY, then the queue. */
  async send(s: ThreadSend<ThreadGifSend>, now = new Date()): Promise<Sent> {
    const key = dedupKey(s);
    const thread = await this.threads.thread(s.phone);
    const windows = () => this.threads.numberWindows(s.phone);
    const at = { now, windows, phone: s.phone, kapso: this.kapso, teacher: !!s.scope };
    const line = await chatLine(thread, at);
    const giphy = this.giphy();
    if (!giphy) throw waHttpError('giphy_not_configured', HttpStatus.SERVICE_UNAVAILABLE);
    const bytes = await giphy.mp4(s.input.gifId);
    const path = gifPath({ actorId: s.actorId, requestId: s.input.clientRequestId });
    const file = { bucket: BUCKETS.waMedia, path, body: bytes };
    await this.storage.upload({ ...file, contentType: GIF_MIME });
    return this.outbox.queue({
      ...outboundBase(s, thread),
      dedup_key: key,
      body: null,
      media_path: path,
      media_mime: GIF_MIME,
      media_name: 'gif.mp4',
      interactive_payload: { type: 'gif' },
      ...line,
    });
  }

  private giphy(): Giphy | null {
    const key = this.key();
    return key ? new Giphy(key, this.fetch) : null;
  }
}
