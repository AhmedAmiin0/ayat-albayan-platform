import type { TemplateDocument } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { BUCKETS, SIGNED_URL_SECONDS } from '../../common/storage/storage.paths';
import { StorageService } from '../../common/storage/storage.service';
import { quickReplyPayloads } from './send-plan';
import type { DueMessage } from './sender.queries';
import { templateButtons, templateParams } from './wa-json';
import { WaError, WHATSAPP_CLIENT, type TemplateRow, type WaSent, type WhatsappClient } from './whatsapp.types';

/**
 * A 7-day signed link to a report PDF (R-REP-03): WhatsApp fetches it after the send and the
 * guardian may open the wa.me fallback later. Only the reports bucket is ever signed here.
 */
export async function documentLink(storage: StorageService, doc: TemplateDocument | undefined): Promise<string | null> {
  if (!doc) return null;
  if (doc.bucket !== BUCKETS.reports) {
    throw new WaError(`document bucket ${doc.bucket} is not the reports bucket`, { code: 100, status: 0 });
  }
  const signed = await storage.signedDownload({ bucket: BUCKETS.reports, path: doc.path, seconds: SIGNED_URL_SECONDS.whatsapp });
  return signed.url;
}

/** Turns one queued row into one Graph call: a template, or a session text (B2's inbox replies). */
@Injectable()
export class MessageDispatch {
  constructor(
    @Inject(WHATSAPP_CLIENT) private readonly client: WhatsappClient,
    private readonly storage: StorageService,
  ) {}

  async send(row: DueMessage, template: TemplateRow | null): Promise<WaSent> {
    if (row.template_key && template) {
      const params = templateParams(row.template_params);
      const documentUrl = template.header_format === 'document' ? await documentLink(this.storage, params.document) : null;
      const ref = row.lesson_id ?? row.lead_id ?? row.id;
      return this.client.sendTemplate({
        to: row.phone_e164,
        template,
        params,
        documentUrl,
        payloads: quickReplyPayloads(templateButtons(template.buttons), { params, ref }),
      });
    }
    if (!row.template_key && row.body) {
      return this.client.sendText({ to: row.phone_e164, text: row.body, replyTo: row.reply_to_wa_id });
    }
    // ponytail: outbound media rows (media_path only) have no producer yet; send them when one exists.
    throw new WaError('nothing to send: no approved template and no text', { code: 100, status: 0 });
  }
}
