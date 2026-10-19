import { recipientAllowed, type WhatsappEnv } from '../../env';
import { graphFetch, graphJson, type FetchLike, type GraphConn, type GraphRequest } from './graph';
import { fetchMedia, nextTemplateCursor, templateEditPath } from './kapso';
import {
  parsed,
  sentSchema,
  submitSchema,
  templatesPageSchema,
  toMetaTemplate,
  uploadHandleSchema,
  uploadSessionSchema,
} from './meta-shapes';
import { mediaMessage, readReceipt, submitPayload, templateMessage, textMessage, type GraphBody } from './wa-components';
import {
  WaError,
  type MetaTemplate,
  type SampleFile,
  type TemplateRow,
  type TemplateSend,
  type WaSent,
  type WhatsappClient,
} from './whatsapp.types';

export const DEFAULT_TIMEOUT_MS = 15_000;

export interface ClientOpts {
  fetch?: FetchLike;
  timeoutMs?: number;
  allowed?: readonly string[] | null;
}
/** ponytail: 20 × 100 templates; the academy has 12. */
const MAX_TEMPLATE_PAGES = 20;
const TEMPLATE_PAGE = 100;
const TEMPLATE_FIELDS = 'id,name,language,status,category,quality_score,components,rejected_reason';

/**
 * WhatsApp Cloud API over the line's base (docs/12 §3.2): tools/wa-stub locally and in e2e, Meta
 * or Kapso's Meta proxy only when production names them (docs/19: the driver differences live in
 * kapso.ts). Without the env every call throws WaError(code null, status 0) before any request.
 */
export class HttpWhatsappClient implements WhatsappClient {
  private readonly conn: GraphConn | null;
  /** WA_ALLOWED_RECIPIENTS (docs/12 §13.5d); null = unrestricted. */
  private readonly allowed: readonly string[] | null;

  constructor(env: WhatsappEnv | null, opts: ClientOpts = {}) {
    this.conn = env ? { env, fetch: opts.fetch ?? fetch, timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS } : null;
    this.allowed = opts.allowed ?? null;
  }

  configured(): boolean {
    return this.conn !== null;
  }

  sendTemplate(input: TemplateSend): Promise<WaSent> {
    return this.send(input.to, () => templateMessage(input));
  }

  sendText(input: { to: string; text: string; replyTo?: string | null }): Promise<WaSent> {
    return this.send(input.to, () => textMessage(input));
  }

  sendDocument(input: Parameters<WhatsappClient['sendDocument']>[0]): Promise<WaSent> {
    return this.send(input.to, () => mediaMessage(input));
  }

  async markRead(waMessageId: string): Promise<void> {
    const c = this.connection();
    await graphFetch(c, { path: `${c.env.phoneNumberId}/messages`, method: 'POST', body: readReceipt(waMessageId) });
  }

  /** Every page, following the cursor while the driver says there is a next page (kapso.ts). */
  async getTemplates(): Promise<MetaTemplate[]> {
    const c = this.connection();
    const all: MetaTemplate[] = [];
    let after: string | undefined;
    for (let page = 0; page < MAX_TEMPLATE_PAGES; page += 1) {
      const cursor = after ? `&after=${encodeURIComponent(after)}` : '';
      const path = `${c.env.wabaId}/message_templates?limit=${TEMPLATE_PAGE}&fields=${TEMPLATE_FIELDS}${cursor}`;
      const body = parsed(templatesPageSchema, await graphJson(c, { path }));
      all.push(...body.data.map(toMetaTemplate));
      after = nextTemplateCursor(c.env, { count: body.data.length, limit: TEMPLATE_PAGE, paging: body.paging });
      if (!after) break;
    }
    return all;
  }

  /**
   * Creates the template (status PENDING). A rejected one Meta already knows is edited in place
   * (templateEditPath): creating it again would be a duplicate name.
   */
  async submitTemplate(template: TemplateRow, opts: { headerHandle?: string } = {}): Promise<{ metaId: string; status: string }> {
    const c = this.connection();
    const payload = submitPayload(template, opts.headerHandle);
    const req: GraphRequest =
      template.status === 'rejected' && template.meta_id
        ? { path: templateEditPath(c.env, template.meta_id), method: 'POST', body: { category: payload['category'], components: payload['components'] } }
        : { path: `${c.env.wabaId}/message_templates`, method: 'POST', body: payload };
    const res = parsed(submitSchema, await graphJson(c, req));
    return { metaId: res.id ?? template.meta_id ?? '', status: res.status ?? 'PENDING' };
  }

  canUploadSamples(): boolean {
    const env = this.conn?.env;
    return env !== undefined && env.provider !== 'kapso' && Boolean(env.appId);
  }

  /**
   * Resumable Upload API: a session on the app (bearer, like every Graph call), then all the bytes
   * at offset 0 to the session id as given (`upload:…?sig=…`, never re-encoded) with `OAuth`.
   */
  async uploadSample(file: SampleFile): Promise<string> {
    const c = this.connection();
    const env = c.env;
    // Kapso has no resumable upload: canUploadSamples() is false there, so only a bug gets here.
    if (env.provider === 'kapso' || !env.appId) throw new WaError('WA_APP_ID is not set', { code: null, status: 0 });
    const q = new URLSearchParams({ file_name: file.name, file_length: String(file.bytes.byteLength), file_type: file.mime });
    const start = await graphJson(c, { path: `${encodeURIComponent(env.appId)}/uploads?${q}`, method: 'POST' });
    const session = parsed(uploadSessionSchema, start);
    const headers = { authorization: `OAuth ${env.accessToken}`, file_offset: '0' };
    const done = await graphJson(c, { path: session.id, method: 'POST', raw: file.bytes, headers });
    return parsed(uploadHandleSchema, done).h;
  }

  /** Metadata, then the bytes, as the line's driver serves them (kapso.ts fetchMedia). */
  getMedia(mediaId: string): Promise<{ bytes: Uint8Array; mime: string }> {
    return fetchMedia(this.connection(), mediaId);
  }

  /** The allow-list check runs BEFORE any request; only a bug can reach it (after the claim). */
  private async send(to: string, build: () => GraphBody): Promise<WaSent> {
    const c = this.connection();
    if (!recipientAllowed(this.allowed, to)) throw new WaError('recipient not allowed', { code: 131030, status: 0 });
    const body = build();
    const res = parsed(sentSchema, await graphJson(c, { path: `${c.env.phoneNumberId}/messages`, method: 'POST', body }));
    const id = res.messages[0]?.id;
    if (!id) throw new WaError('WhatsApp answered without a message id', { code: null, status: 200 });
    return { waMessageId: id };
  }

  private connection(): GraphConn {
    if (!this.conn) throw new WaError('WhatsApp is not configured', { code: null, status: 0 });
    return this.conn;
  }
}
