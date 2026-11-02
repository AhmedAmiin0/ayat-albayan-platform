import { WA_ERROR } from '@ab/shared';
import { recipientAllowed, type GraphEnv } from '@/config/env/env';
import { z } from 'zod';
import type { Http } from '@/common/infra/http/http.types';
import { graphHttp, type FetchLike, type GraphConn } from './drivers/meta/graph';
import { fetchMedia, nextTemplateCursor, templateEditPath } from './drivers/kapso/kapso';
import {
  sentSchema,
  submitSchema,
  templatesPageSchema,
  toMetaTemplate,
} from './drivers/meta/meta-shapes';
import { resumableUpload } from './drivers/meta/meta-upload';
import { callPermissionMessage } from './messages/wa-call-permission';
import { mediaMessage, readReceipt, submitPayload, templateMessage, textMessage, type GraphBody } from './messages/wa-components';
import { reactionMessage } from './drivers/meta/meta-reaction';
import { WaError, type MetaTemplate, type ReactionSend, type SampleFile, type TemplateRow, type TemplateSend, type WaSent, type WhatsappClient } from './whatsapp.types';

export const DEFAULT_TIMEOUT_MS = 15_000;

export interface ClientOpts {
  fetch?: FetchLike;
  timeoutMs?: number;
  allowed?: readonly string[] | null;
}

/** A read receipt's 2xx body is not checked (any answer, as before). */
const ANY = z.unknown();

interface Connected {
  conn: GraphConn;
  env: GraphConn['env'];
  http: Http;
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

  constructor(env: GraphEnv | null, opts: ClientOpts = {}) {
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

  sendCallPermissionRequest(input: { to: string; text: string }): Promise<WaSent> {
    return this.send(input.to, () => callPermissionMessage(input));
  }

  sendReaction(input: ReactionSend): Promise<WaSent> {
    return this.send(input.to, () => reactionMessage(input));
  }

  async markRead(waMessageId: string): Promise<void> {
    const { env, http } = this.connection();
    const json = readReceipt(waMessageId);
    await http.json({ path: `${env.phoneNumberId}/messages`, method: 'POST', json, schema: ANY });
  }

  /** Every page, following the cursor while the driver says there is a next page (kapso.ts). */
  async getTemplates(): Promise<MetaTemplate[]> {
    const { env, http } = this.connection();
    const all: MetaTemplate[] = [];
    let after: string | undefined;
    for (let page = 0; page < MAX_TEMPLATE_PAGES; page += 1) {
      const cursor = after ? `&after=${encodeURIComponent(after)}` : '';
      const path = `${env.wabaId}/message_templates?limit=${TEMPLATE_PAGE}&fields=${TEMPLATE_FIELDS}${cursor}`;
      const body = await http.json({ path, schema: templatesPageSchema });
      all.push(...body.data.map(toMetaTemplate));
      after = nextTemplateCursor(env, { count: body.data.length, limit: TEMPLATE_PAGE, paging: body.paging });
      if (!after) break;
    }
    return all;
  }

  /**
   * Creates the template (status PENDING). A rejected one Meta already knows is edited in place
   * (templateEditPath): creating it again would be a duplicate name.
   */
  async submitTemplate(template: TemplateRow, opts: { headerHandle?: string } = {}): Promise<{ metaId: string; status: string }> {
    const { env, http } = this.connection();
    const payload = submitPayload(template, opts.headerHandle);
    const edit = { category: payload['category'], components: payload['components'] };
    const req =
      template.status === 'rejected' && template.meta_id
        ? { path: templateEditPath(env, template.meta_id), json: edit }
        : { path: `${env.wabaId}/message_templates`, json: payload };
    const res = await http.json({ ...req, method: 'POST', schema: submitSchema });
    return { metaId: res.id ?? template.meta_id ?? '', status: res.status ?? 'PENDING' };
  }

  canUploadSamples(): boolean {
    const env = this.conn?.env;
    return env !== undefined && env.provider !== 'kapso' && Boolean(env.appId);
  }

  /** Meta's Resumable Upload API (meta-upload.ts): the template sample's header handle. */
  uploadSample(file: SampleFile): Promise<string> {
    return resumableUpload(this.connection().conn, file);
  }

  /** Metadata, then the bytes, as the line's driver serves them (kapso.ts fetchMedia). */
  getMedia(mediaId: string): Promise<{ bytes: Uint8Array; mime: string }> {
    return fetchMedia(this.connection().conn, mediaId);
  }

  /** The allow-list check runs BEFORE any request; only a bug can reach it (after the claim). */
  private async send(to: string, build: () => GraphBody): Promise<WaSent> {
    const { env, http } = this.connection();
    if (!recipientAllowed(this.allowed, to)) throw new WaError('recipient not allowed', { code: WA_ERROR.recipientNotAllowed, status: 0 });
    const body = build();
    const path = `${env.phoneNumberId}/messages`;
    const res = await http.json({ path, method: 'POST', json: body, schema: sentSchema });
    const id = res.messages[0]?.id;
    if (!id) throw new WaError('WhatsApp answered without a message id', { code: null, status: 200 });
    return { waMessageId: id };
  }

  private connection(): Connected {
    if (!this.conn) throw new WaError('WhatsApp is not configured', { code: null, status: 0 });
    return { conn: this.conn, env: this.conn.env, http: graphHttp(this.conn) };
  }
}
