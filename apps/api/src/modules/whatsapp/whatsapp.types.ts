import type { Tables } from '@ab/db';
import type { TemplateParams } from '@ab/shared';

// WhatsappClient contract (docs/12 §3). B1 implements it over WA_API_BASE (tools/wa-stub locally
// and in e2e); B2/B3 inject it with `@Inject(WHATSAPP_CLIENT)` and fake it in unit tests.
// Foundation-owned: change it only through the contract doc.

export const WHATSAPP_CLIENT = Symbol('WHATSAPP_CLIENT');

/** One message_templates row. */
export type TemplateRow = Tables<'message_templates'>;

export interface WaSent {
  /** Meta's wamid; stored in messages.wa_message_id. */
  waMessageId: string;
}

/** A template as Meta lists it (GET /{waba}/message_templates). Statuses are Meta's spelling. */
export interface MetaTemplate {
  id: string;
  name: string;
  language: string;
  /** APPROVED | PENDING | REJECTED | PAUSED | DISABLED | IN_APPEAL | … */
  status: string;
  category: string;
  /** GREEN | YELLOW | RED | UNKNOWN; null when Meta sends none. */
  quality: string | null;
  components: unknown[];
  rejectedReason: string | null;
}

export interface TemplateSend {
  /** E.164; the client sends the digits Meta wants. */
  to: string;
  template: TemplateRow;
  params: TemplateParams;
  /** Signed URL of params.document for a document-header template (7 days). */
  documentUrl?: string | null;
  /** Quick-reply payloads by button index (params.payloads, else derived by the sender). */
  payloads?: readonly string[];
}

/**
 * Every call throws WaError on a Meta error or a network failure, and WaError with code null and
 * status 0 when WhatsApp is not configured (whatsappEnv(env) === null).
 */
export interface WhatsappClient {
  configured(): boolean;
  sendTemplate(input: TemplateSend): Promise<WaSent>;
  /** Session text: only inside the 24 h window (Meta answers 131047 otherwise). */
  sendText(input: { to: string; text: string; replyTo?: string | null }): Promise<WaSent>;
  /** Session document by link (a signed Storage URL). */
  sendDocument(input: { to: string; url: string; filename: string; caption?: string | null }): Promise<WaSent>;
  /** Blue ticks for an inbound wamid (POST /messages {status:'read'}). */
  markRead(waMessageId: string): Promise<void>;
  /** All pages of the WABA's templates. Read-only: safe for the health check. */
  getTemplates(): Promise<MetaTemplate[]>;
  /** Creates the template on Meta (status PENDING). Only ever from the explicit admin route. */
  submitTemplate(template: TemplateRow): Promise<{ metaId: string; status: string }>;
  /** Downloads inbound media: metadata GET /{media_id}, then the bytes with the bearer. */
  getMedia(mediaId: string): Promise<{ bytes: Uint8Array; mime: string }>;
}

/** A failed Graph call. `code` = Meta's error code (132001, 131047, …) or null (network, 5xx). */
export class WaError extends Error {
  constructor(
    message: string,
    readonly info: {
      code: number | null;
      status: number;
      details?: string;
      /** The request may have reached Meta (timeout, connection lost mid-call): a resend could duplicate it. */
      uncertain?: boolean;
    },
  ) {
    super(message);
    this.name = 'WaError';
  }
}
