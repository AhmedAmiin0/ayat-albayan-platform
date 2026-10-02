import type { z } from 'zod';
import type { WhatsappEnv } from '../../env';
import { graphFetch, graphJson, type FetchLike, type GraphConn, type GraphRequest } from './graph';
import { mediaSchema, sentSchema, submitSchema, templatesPageSchema, toMetaTemplate } from './meta-shapes';
import { documentMessage, readReceipt, submitPayload, templateMessage, textMessage, type GraphBody } from './wa-components';
import {
  WaError,
  type MetaTemplate,
  type TemplateRow,
  type TemplateSend,
  type WaSent,
  type WhatsappClient,
} from './whatsapp.types';

export const DEFAULT_TIMEOUT_MS = 15_000;
/** ponytail: 20 × 100 templates; the academy has 12. */
const MAX_TEMPLATE_PAGES = 20;
const TEMPLATE_FIELDS = 'id,name,language,status,category,quality_score,components,rejected_reason';

/**
 * WhatsApp Cloud API over WA_API_BASE (docs/12 §3.2): tools/wa-stub locally and in e2e, Meta only
 * when production deliberately names graph.facebook.com. Without the env every call throws
 * WaError(code null, status 0) before any request.
 */
export class HttpWhatsappClient implements WhatsappClient {
  private readonly conn: GraphConn | null;

  constructor(env: WhatsappEnv | null, opts: { fetch?: FetchLike; timeoutMs?: number } = {}) {
    this.conn = env ? { env, fetch: opts.fetch ?? fetch, timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS } : null;
  }

  configured(): boolean {
    return this.conn !== null;
  }

  sendTemplate(input: TemplateSend): Promise<WaSent> {
    return this.send(() => templateMessage(input));
  }

  sendText(input: { to: string; text: string; replyTo?: string | null }): Promise<WaSent> {
    return this.send(() => textMessage(input));
  }

  sendDocument(input: { to: string; url: string; filename: string; caption?: string | null }): Promise<WaSent> {
    return this.send(() => documentMessage(input));
  }

  async markRead(waMessageId: string): Promise<void> {
    const c = this.connection();
    await graphFetch(c, { path: `${c.env.phoneNumberId}/messages`, method: 'POST', body: readReceipt(waMessageId) });
  }

  /** Every page, following Meta's cursor only while it says there is a next page. */
  async getTemplates(): Promise<MetaTemplate[]> {
    const c = this.connection();
    const all: MetaTemplate[] = [];
    let after: string | undefined;
    for (let page = 0; page < MAX_TEMPLATE_PAGES; page += 1) {
      const cursor = after ? `&after=${encodeURIComponent(after)}` : '';
      const path = `${c.env.wabaId}/message_templates?limit=100&fields=${TEMPLATE_FIELDS}${cursor}`;
      const body = this.parsed(templatesPageSchema, await graphJson(c, { path }));
      all.push(...body.data.map(toMetaTemplate));
      after = body.paging?.next ? body.paging.cursors?.after : undefined;
      if (!after) break;
    }
    return all;
  }

  /**
   * Creates the template (status PENDING). A rejected one Meta already knows is edited in place
   * (POST /{template id}): creating it again would be a duplicate name.
   */
  async submitTemplate(template: TemplateRow): Promise<{ metaId: string; status: string }> {
    const c = this.connection();
    const payload = submitPayload(template);
    const req: GraphRequest =
      template.status === 'rejected' && template.meta_id
        ? { path: template.meta_id, method: 'POST', body: { category: payload['category'], components: payload['components'] } }
        : { path: `${c.env.wabaId}/message_templates`, method: 'POST', body: payload };
    const res = this.parsed(submitSchema, await graphJson(c, req));
    return { metaId: res.id ?? template.meta_id ?? '', status: res.status ?? 'PENDING' };
  }

  /** Metadata (GET /{media id}), then the bytes from Meta's short-lived URL with the bearer. */
  async getMedia(mediaId: string): Promise<{ bytes: Uint8Array; mime: string }> {
    const c = this.connection();
    const meta = this.parsed(mediaSchema, await graphJson(c, { path: encodeURIComponent(mediaId) }));
    const res = await graphFetch(c, { path: meta.url });
    return { bytes: new Uint8Array(await res.arrayBuffer()), mime: meta.mime_type };
  }

  private async send(build: () => GraphBody): Promise<WaSent> {
    const c = this.connection();
    const body = build();
    const res = this.parsed(sentSchema, await graphJson(c, { path: `${c.env.phoneNumberId}/messages`, method: 'POST', body }));
    const id = res.messages[0]?.id;
    if (!id) throw new WaError('WhatsApp answered without a message id', { code: null, status: 200 });
    return { waMessageId: id };
  }

  private connection(): GraphConn {
    if (!this.conn) throw new WaError('WhatsApp is not configured', { code: null, status: 0 });
    return this.conn;
  }

  private parsed<S extends z.ZodType>(schema: S, json: unknown): z.output<S> {
    const r = schema.safeParse(json);
    if (!r.success) throw new WaError('Unexpected WhatsApp response', { code: null, status: 200, details: r.error.message.slice(0, 300) });
    return r.data;
  }
}
