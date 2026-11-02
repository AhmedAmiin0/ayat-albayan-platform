import { baseMime, chatFileMaxBytes } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import type { MediaMessage } from '@/modules/messaging/whatsapp/messages/inbound-media.repo';
import { allowedCrmUrl } from './crm-history-url';
import { fetchCrmMedia } from './crm-media.fetch';
import { CrmMediaSettings } from './crm-media.settings';

/**
 * A family's file imported from the old CRM (no Meta media id; the body is only its storage link,
 * owner 2026-10-27): fetched from that storage, for InboundMedia.cache to keep in wa-media like any
 * inbound file. Only a link on exactly the crm_media_host setting's host is fetched; an empty
 * setting or another host is 410 media_expired, as before. Two opens of the same file at once share
 * one fetch.
 */
@Injectable()
export class CrmHistoryMedia {
  private readonly inflight = new Map<string, Promise<{ bytes: Uint8Array }>>();

  constructor(private readonly settings: CrmMediaSettings) {}

  download(msg: MediaMessage): Promise<{ bytes: Uint8Array }> {
    const running = this.inflight.get(msg.id);
    if (running) return running;
    const next = this.fetch(msg).finally(() => this.inflight.delete(msg.id));
    this.inflight.set(msg.id, next);
    return next;
  }

  private async fetch(msg: MediaMessage): Promise<{ bytes: Uint8Array }> {
    const { crm_media_host: host } = await this.settings.read();
    const url = allowedCrmUrl(msg.body, host);
    if (!url) throw waHttpError('media_expired', HttpStatus.GONE);
    const mime = baseMime(msg.media_mime);
    return { bytes: await fetchCrmMedia({ url, mime, maxBytes: chatFileMaxBytes(mime) }) };
  }
}
