import type { Tables } from '@ab/db';
import {
  isWaLine, type NumberPurpose, type TemplateParams, type WaLine, type WaSendKind,
} from '@ab/shared';

// WhatsappClient contract (docs/12 §3): B1 implements it over WA_API_BASE (wa-stub locally, e2e);
// B2/B3 inject it with `@Inject(WHATSAPP_CLIENT)`. Foundation-owned: change it via the contract.

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
  waMessageId: string; // Meta's wamid (messages.wa_message_id)
  asText?: true; // the Evolution driver sent a template as plain text (Baileys has no templates)
  media?: SentFile; // the file that went instead of the row's (a refused voice note's m4a)
}

/** The outbox row's file columns. */
export type SentFile = Record<'media_path' | 'media_mime' | 'media_name', string>;

/** A voice note by uploaded media id (Graph lines: capsOf().mediaUpload). */
export interface VoiceUpload {
  /** POST /{phone}/media, type audio/ogg (bare): the media id. Nobody is messaged yet. */
  upload(ogg: Uint8Array): Promise<string>;
  send(input: { to: string; id: string; replyTo?: string | null }): Promise<WaSent>;
}

/** A template as Meta lists it (GET /{waba}/message_templates). Statuses are Meta's spelling. */
export interface MetaTemplate {
  id: string;
  name: string;
  language: string;
  status: string; // APPROVED | PENDING | REJECTED | PAUSED | DISABLED | IN_APPEAL | …
  category: string;
  quality: string | null; // GREEN | YELLOW | RED | UNKNOWN; null when Meta sends none
  components: unknown[];
  rejectedReason: string | null;
}

export interface TemplateSend {
  to: string; // E.164; the client sends the digits Meta wants
  template: TemplateRow;
  params: TemplateParams;
  documentUrl?: string | null; // signed URL of params.document (a document header, 7 days)
  payloads?: readonly string[]; // quick-reply payloads by button index (else the sender's)
}

/** A sample file Meta shows the template reviewer (report_ready's PDF header). */
export interface SampleFile { name: string; mime: string; bytes: Uint8Array<ArrayBuffer> }

/**
 * A session file by link; `kind` defaults to document, `filename` is a document's only, an audio
 * takes no caption. `replyTo` = the quoted wamid (Meta's context; the crm driver drops it and
 * `voice`: a CRM line sends files as documents only). */
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
  /** Staff chat only (Evolution Baileys, automatic sends off): a job's row is refused. */
  automaticOff?(): boolean;
  /** Evolution Baileys: ms before `to` may go (pacing) and the daily cap; absent = no pacing. */
  pace?(to: string): { waitMs: number; dailyCap: number; gapMs: number } | null;
  markRead(waMessageId: string): Promise<void>; // blue ticks (POST /messages {status:'read'})
  getTemplates(): Promise<MetaTemplate[]>; // all pages; read-only (safe for the health check)
  /**
   * Creates the template on Meta (status PENDING). Only ever from the explicit admin route. A
   * document header needs `headerHandle` from uploadSample (Meta's sample for the reviewer).
   */
  submitTemplate(template: TemplateRow, opts?: { headerHandle?: string }): Promise<{ metaId: string; status: string }>;
  canUploadSamples(): boolean; // WA_APP_ID set: the Resumable Upload API is usable
  /** Uploads a voice note and sends it by id; absent or null = this line sends by link only. */
  voice?(): VoiceUpload | null;
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
      code: number | null; status: number; details?: string;
      /** The request may have reached Meta (timeout, connection lost mid-call): a resend could duplicate it. */
      uncertain?: boolean;
      /** Kapso refused the line's project key, or the CRM its API key (docs/19): held like Meta's 190, in its own words. */
      credential?: 'kapso' | 'crm' | 'evolution';
      missingScope?: string; // the scope the CRM's 403 named («templates:read», docs/39)
      /** The crm driver's error code («meta_error», «template_malformed», «bad_request», …): fails at once, never retried. */
      crmCode?: string;
      retryAfterMs?: number; // the CRM's 429: try again after this long, the try not counted
      /** The call is not supported by this line's driver (the crm driver: template list / submit / samples / media). */
      unsupported?: 'crm' | 'evolution';
      blocked?: 'evolution_auto_off'; // the number's own safety rule, before any call (docs/19)
      template?: string; // crm: the template name sent (a 132001 marks only the key's own name)
    },
  ) {
    super(message);
    this.name = 'WaError';
  }
}
