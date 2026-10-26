// Stub state and route types shared by the Graph routes (stub.ts) and the control routes.
import type { IncomingMessage } from 'node:http';
import type { Json, StubTemplate } from './providers/meta.ts';

/** The optional second Meta number (docs/12 §13.12): its own phone id, WABA, token and secret. */
export interface ChatLineOptions {
  phoneNumberId: string;
  wabaId?: string;
  accessToken?: string;
  appSecret?: string;
  appId?: string;
}

/** Kapso's Meta proxy (docs/19): its project key, and where Kapso-signed webhooks go. */
export interface KapsoOptions {
  /** When set, X-API-Key must equal it; otherwise any key passes (never a bearer). */
  apiKey?: string;
  /** The API's POST /webhooks/kapso. */
  webhookUrl?: string;
  /** X-Webhook-Signature key (KAPSO_WEBHOOK_SECRET). */
  webhookSecret?: string;
}

/** The academy CRM's REST API (docs/19 «crm driver»): its Bearer key and the key's scopes. */
export interface CrmOptions {
  /** When set, the Bearer must equal it; otherwise any bearer passes. */
  apiKey?: string;
  /** GET /me's scopes (default ['messages:send']); without messages:send POST /messages is 403. */
  scopes?: string[];
}

/** One Graph call as it arrived: through which prefix and with which credential kind. */
export interface RequestLog {
  via: 'graph' | 'kapso' | 'crm';
  method: string;
  path: string;
  auth: 'api-key' | 'bearer' | 'oauth' | 'none';
}

export interface StubOptions {
  templates?: StubTemplate[];
  /** API webhook that simulated inbound messages and statuses are POSTed to (signed). */
  webhookUrl?: string;
  appSecret?: string;
  phoneNumberId?: string;
  /** When set, the bearer token must equal it; otherwise any bearer passes. */
  accessToken?: string;
  /** WABA of the notifications line (diagnostics: GET /{waba}/subscribed_apps). */
  wabaId?: string;
  /** Meta app subscribed to the notifications WABA (diagnostics). */
  appId?: string;
  /** Absent = single-line, exactly as before the chat line existed. */
  chat?: ChatLineOptions;
  /** Free-form messages need an inbound from that number in the last 24 h (default true). */
  enforceWindow?: boolean;
  /** The kapso prefix's key and webhook (absent = any key passes, no Kapso webhook). */
  kapso?: KapsoOptions;
  /** The crm prefix's key and scopes (absent = any bearer, messages:send). */
  crm?: CrmOptions;
}

export interface SentMessage {
  id: string;
  to: string;
  type: string;
  template?: string;
  body: unknown;
  /** The phone-number id of the Graph path the message was sent through (its line). */
  phoneNumberId?: string;
  /** Through Meta's paths, the Kapso prefix or the CRM prefix (docs/19), so e2e can scope a send to its driver. */
  via?: 'graph' | 'kapso' | 'crm';
}

/** A read receipt with the line (phone-number id) it was sent through. */
export interface ReadMark {
  phoneNumberId: string;
  messageId: string;
}

/** What GET /{phone_number_id} and GET /{waba}/subscribed_apps answer for one line. */
export interface LineHealth {
  subscribed: boolean;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
  status: string;
  name_status: string;
  code_verification_status: string;
  override_callback_uri?: string;
}

export interface StubState {
  opts: StubOptions;
  templates: StubTemplate[];
  sent: SentMessage[];
  /** wamids marked read through POST /messages {status:'read'}. */
  reads: string[];
  /** The same reads with their line: GET /__stub/reads/by-line. */
  readLog: ReadMark[];
  /** phone-number id → its diagnostics answer; POST /__stub/lines/{pn} edits, reset restores. */
  health: Map<string, LineHealth>;
  media: Map<string, { mime: string; bytes: Buffer }>;
  /** digits → ms of the last simulated inbound message. */
  lastInbound: Map<string, number>;
  /** digits → the Meta error the next send to that number gets. */
  failNext: Map<string, Json>;
  /** Open resumable-upload sessions by id (without `upload:`): the `sig` and what was announced. */
  uploads: Map<string, { sig: string; length: number; type: string }>;
  /** Handles of finished uploads: the only header_handle values template creation accepts. */
  handles: Set<string>;
  /** Every Graph call (not /__stub), Meta's paths and the kapso prefix: GET /__stub/requests. */
  requests: RequestLog[];
}

export type Reply = [number, unknown] | { status: number; mime: string; bytes: Buffer };
export type Route = [string, RegExp, (req: IncomingMessage, m: RegExpExecArray, s: StubState) => Promise<Reply>];

export const digits = (phone: unknown) => String(phone ?? '').replace(/\D/g, '');
export const DAY_MS = 24 * 60 * 60 * 1000;

export async function readBytes(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

export async function readJson(req: IncomingMessage): Promise<Json> {
  const bytes = await readBytes(req);
  return bytes.length ? (JSON.parse(bytes.toString('utf8')) as Json) : {};
}
