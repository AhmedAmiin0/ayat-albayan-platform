import type { Tables } from '@ab/db';
import type { TemplateParams, WaLine } from '@ab/shared';

// WhatsappClient contract (docs/12 §3). B1 implements it over WA_API_BASE (tools/wa-stub locally
// and in e2e); B2/B3 inject it with `@Inject(WHATSAPP_CLIENT)` and fake it in unit tests.
// Foundation-owned: change it only through the contract doc.

export const WHATSAPP_CLIENT = Symbol('WHATSAPP_CLIENT');
/** One client per line (docs/12 §13.4); WHATSAPP_CLIENT = its notifications client. */
export const WHATSAPP_LINES = Symbol('WHATSAPP_LINES');

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

/** A sample file Meta shows the template reviewer (report_ready's PDF header). */
export interface SampleFile {
  name: string;
  mime: string;
  bytes: Uint8Array<ArrayBuffer>;
}

/** A session image or document by link; `kind` defaults to document, `filename` is a document's only. */
export interface MediaSend {
  to: string;
  kind?: 'image' | 'document';
  url: string;
  filename?: string;
  caption?: string | null;
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
  /** Session image or document by link (a signed Storage URL); same body on both drivers. */
  sendDocument(input: MediaSend): Promise<WaSent>;
  /** Blue ticks for an inbound wamid (POST /messages {status:'read'}). */
  markRead(waMessageId: string): Promise<void>;
  /** All pages of the WABA's templates. Read-only: safe for the health check. */
  getTemplates(): Promise<MetaTemplate[]>;
  /**
   * Creates the template on Meta (status PENDING). Only ever from the explicit admin route. A
   * document header needs `headerHandle` from uploadSample (Meta's sample for the reviewer).
   */
  submitTemplate(template: TemplateRow, opts?: { headerHandle?: string }): Promise<{ metaId: string; status: string }>;
  /** WA_APP_ID is set: the Resumable Upload API (sample files for template headers) is usable. */
  canUploadSamples(): boolean;
  /** Resumable Upload API (session on the app, then the bytes): the handle for header_handle. */
  uploadSample(file: SampleFile): Promise<string>;
  /** Downloads inbound media: metadata GET /{media_id}, then the bytes with the bearer. */
  getMedia(mediaId: string): Promise<{ bytes: Uint8Array; mime: string }>;
}

/** WHATSAPP_LINES: one client per line; an unconfigured line's client refuses every call. */
export type WhatsappLines = Record<WaLine, WhatsappClient>;

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
      /** Kapso refused the line's project key (docs/19): held like Meta's 190, but its own words. */
      credential?: 'kapso';
    },
  ) {
    super(message);
    this.name = 'WaError';
  }
}
