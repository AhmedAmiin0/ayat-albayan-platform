import { WA_ERROR } from '@ab/shared';
import { z } from 'zod';
import { recipientAllowed, type CrmLineEnv } from '@/config/env/env';
import { crmMediaBody, crmTemplateBody, crmTextBody, type CrmBody } from './crm-body';
import { crmJson, type CrmConn } from './crm-http';
import { afterDocument, crmReportBodies } from './crm-report';
import type { FetchLike } from '@/modules/messaging/whatsapp/drivers/meta/graph';
import { WaError, type MediaSend, type MetaTemplate, type TemplateSend, type WaSent, type WhatsappClient } from '@/modules/messaging/whatsapp/whatsapp.types';

// The crm driver (docs/19 «crm driver»): a line that sends through the academy CRM's POST /messages. The
// CRM owns the number, its templates and its conversations, so only sending is supported here.

interface CrmClientOpts {
  fetch?: FetchLike;
  timeoutMs?: number;
  allowed?: readonly string[] | null;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/** POST /messages answers 201 {data:{message_id, whatsapp_message_id, …}}; only the wamid is kept. */
const sentSchema = z.object({ whatsapp_message_id: z.string().min(1) });

/** What callers recognise as «not supported by the crm driver» (template-env, inbound media, number sync). */
export const crmUnsupported = (what: string): WaError =>
  new WaError(`${what} is not supported by the crm driver (templates and media live in the CRM)`, { code: null, status: 0, unsupported: 'crm' });

/**
 * WhatsappClient over the CRM's REST API. Without the env every call throws WaError(code null, status 0)
 * before any request, like HttpWhatsappClient. The allow-list is checked before any request.
 */
export class CrmWhatsappClient implements WhatsappClient {
  private readonly conn: CrmConn | null;
  private readonly allowed: readonly string[] | null;

  constructor(env: CrmLineEnv | null, opts: CrmClientOpts = {}) {
    this.conn = env ? { env, fetch: opts.fetch ?? fetch, timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS } : null;
    this.allowed = opts.allowed ?? null;
  }

  configured(): boolean {
    return this.conn !== null;
  }

  /** A report on the old script's flow (crm-report.ts) is two calls: the PDF, then its template. */
  async sendTemplate(input: TemplateSend): Promise<WaSent> {
    const report = crmReportBodies(input);
    if (!report) return this.send(input.to, () => crmTemplateBody(input));
    await this.send(input.to, () => report.document);
    try {
      return await this.send(input.to, () => report.template);
    } catch (e) {
      throw afterDocument(e);
    }
  }

  /** replyTo is ignored: the CRM's reply_to_message_id is its own uuid, never a wamid. */
  sendText(input: { to: string; text: string; replyTo?: string | null }): Promise<WaSent> {
    return this.send(input.to, () => crmTextBody(input));
  }

  sendDocument(input: MediaSend): Promise<WaSent> {
    return this.send(input.to, () => crmMediaBody(input));
  }

  /** The CRM owns the conversation (and its read receipts): nothing to do. */
  async markRead(): Promise<void> {
    this.connection();
  }

  getTemplates(): Promise<MetaTemplate[]> {
    return Promise.reject(crmUnsupported('the template list'));
  }

  submitTemplate(): Promise<{ metaId: string; status: string }> {
    return Promise.reject(crmUnsupported('template submit'));
  }

  canUploadSamples(): boolean {
    return false;
  }

  uploadSample(): Promise<string> {
    return Promise.reject(crmUnsupported('sample upload'));
  }

  getMedia(): Promise<{ bytes: Uint8Array; mime: string }> {
    return Promise.reject(crmUnsupported('inbound media'));
  }

  private async send(to: string, build: () => CrmBody): Promise<WaSent> {
    const c = this.connection();
    if (!recipientAllowed(this.allowed, to)) throw new WaError('recipient not allowed', { code: WA_ERROR.recipientNotAllowed, status: 0 });
    const data = await crmJson(c, { path: 'messages', method: 'POST', body: build() });
    const sent = sentSchema.safeParse(data);
    // A 2xx means the CRM sent it: without the wamid it cannot be matched, and a resend would duplicate it.
    if (!sent.success) throw new WaError('the CRM answered without a whatsapp_message_id', { code: null, status: 201, uncertain: true });
    return { waMessageId: sent.data.whatsapp_message_id };
  }

  private connection(): CrmConn {
    if (!this.conn) throw new WaError('WhatsApp is not configured', { code: null, status: 0 });
    return this.conn;
  }
}
