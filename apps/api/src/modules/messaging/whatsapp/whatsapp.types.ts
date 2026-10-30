import type { Tables } from '@ab/db';
import {
  isWaLine, type NumberPurpose, type TemplateParams, type WaLine, type WaSendKind,
} from '@ab/shared';

// WhatsappClient contract (docs/12 §3). B1 implements it over WA_API_BASE (tools/wa-stub locally
// and in e2e); B2/B3 inject it with `@Inject(WHATSAPP_CLIENT)` and fake it in unit tests.
// Foundation-owned: change it only through the contract doc.

export const WHATSAPP_CLIENT = Symbol('WHATSAPP_CLIENT');
/** One client per line (docs/12 §13.4); WHATSAPP_CLIENT = its notifications client. */
export const WHATSAPP_LINES = Symbol('WHATSAPP_LINES');

/** One message_templates row; never on the `calls` line (migration 984's check, docs/28 §10). */
export type TemplateRow = Omit<Tables<'message_templates'>, 'line'> & { line: WaLine };

/** Rows as read, narrowed to a messaging line (a `calls` row cannot exist: dropped, unsent). */
export function templateRows<T extends { line: NumberPurpose }>(
  rows: readonly T[],
): (T & { line: WaLine })[] {
  return rows.filter((r): r is T & { line: WaLine } => isWaLine(r.line));
}

/** One row (null when absent or, impossibly, on the calls line). */
export const templateRow = <T extends { line: NumberPurpose }>(
  row: T | null,
): (T & { line: WaLine }) | null => (row ? (templateRows([row])[0] ?? null) : null);

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

/**
 * A session file by link; `kind` defaults to document, `filename` is a document's only, an audio
 * takes no caption. `replyTo` = the quoted wamid (Meta's context; the crm driver drops it, and
 * `voice` too: a CRM line sends files as documents only).
 */
export interface MediaSend {
  to: string;
  kind?: WaSendKind;
  url: string;
  filename?: string;
  caption?: string | null;
  replyTo?: string | null;
  /** An ogg/opus audio as WhatsApp's voice note (mic icon, auto-download); Meta ignores it on other audio. */
  voice?: boolean;
}

/** A reaction to `messageId` (a wamid of this number); emoji null = remove ours. */
export interface ReactionSend {
  to: string;
  messageId: string;
  emoji: string | null;
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
  /** Interactive call_permission_request (docs/28); Graph drivers only (absent = this driver cannot). */
  sendCallPermissionRequest?(input: { to: string; text: string }): Promise<WaSent>;
  /** A message reaction (Meta and Kapso); absent = this driver cannot (the CRM). */
  sendReaction?(input: ReactionSend): Promise<WaSent>;
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
      /** Kapso refused the line's project key, or the CRM its API key (docs/19): held like Meta's 190, in its own words. */
      credential?: 'kapso' | 'crm';
      /** The crm driver's error code («meta_error», «template_malformed», «bad_request», …): fails at once, never retried. */
      crmCode?: string;
      /** The CRM's rate limit (429): try again after this long, the try not counted. */
      retryAfterMs?: number;
      /** The call is not supported by this line's driver (the crm driver: template list / submit / samples / media). */
      unsupported?: 'crm';
    },
  ) {
    super(message);
    this.name = 'WaError';
  }
}
