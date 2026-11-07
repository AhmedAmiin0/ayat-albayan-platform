import type { EvolutionMode, WaLine, WaProvider } from '@ab/shared';
import type { Env } from '@/config/env/env';
import { crmLine } from './env.crm';
import { evolutionLine } from './env.evolution';
import { kapsoLine } from './env.kapso';
import { chatEnv, metaNotifications } from './env.meta';

// WhatsApp lines (docs/12 §13.1): the notifications line (WA_*) and the optional chat line
// (WA_CHAT_*). Type-only import of Env, so env.ts can re-export this file without a runtime cycle.

export { allowedRecipients, parseAllowedRecipients, recipientAllowed } from './env.recipients';
export { chatKeyGaps, hasChatKeys } from './env.meta';

interface LineConn {
  base: string;
  version: string;
  phoneNumberId: string;
  wabaId: string;
}
/** A line on Meta's Cloud API (provider absent = meta: today's shape, unchanged). */
export interface MetaLineEnv extends LineConn {
  provider?: 'meta';
  accessToken: string;
  /** WA_APP_ID (chat: WA_CHAT_APP_ID); absent = no sample uploads, so a document-header template can't be submitted. */
  appId?: string;
}
/** A line on Kapso's Meta proxy (docs/19): X-API-Key instead of a bearer, never an app id. */
export interface KapsoLineEnv extends LineConn {
  provider: 'kapso';
  apiKey: string;
}
/**
 * A line on the academy CRM's REST API (docs/19 «crm driver»): its base and Bearer key only. The number,
 * its WABA and its templates are the CRM's, so there is no phoneNumberId / wabaId / version here.
 */
export interface CrmLineEnv {
  provider: 'crm';
  base: string;
  apiKey: string;
}
/**
 * A number on a self-hosted Evolution API instance (docs/19 «Evolution driver»): the shared base,
 * the instance name and ITS token (`apikey`), the engine, and the Baileys safety settings.
 */
export interface EvolutionLineEnv {
  provider: 'evolution';
  base: string;
  instance: string;
  token: string;
  mode: EvolutionMode;
  /** Baileys: automatic notifications / templates allowed (default false: staff chat only). */
  autoSends: boolean;
  /** Baileys: minimum gap between sends to different recipients (the number's limits.gap_ms). */
  gapMs: number;
  /** Baileys: at most this many sends a UTC day from the number (limits.daily_cap). */
  dailyCap: number;
  /** sendText `linkPreview` (sending.*). Never a `delay`: it shows «يكتب…» to the family. */
  linkPreview: boolean;
}
/** A line the Graph client (graph.ts) can reach: Meta's Cloud API or Kapso's Meta proxy (or the stub). */
export type GraphEnv = MetaLineEnv | KapsoLineEnv;
/** What a line's WhatsappClient needs (client-factory.ts picks the client by provider). */
export type WhatsappEnv = GraphEnv | CrmLineEnv | EvolutionLineEnv;

/** The drivers with no Graph ids of ours (no phone_number_id / WABA / version). */
const OFF_GRAPH: ReadonlySet<string | undefined> = new Set(['crm', 'evolution']);
/** A meta or kapso line: Graph's paths and ids apply. */
export const isGraphEnv = (e: WhatsappEnv): e is GraphEnv => !OFF_GRAPH.has(e.provider);

/** What each line needs to SEND; null = that line is not configured. */
export type LineEnvs = Record<WaLine, WhatsappEnv | null>;
/** What the webhook needs to RECEIVE: the phone-number id of each line that has one. */
export type LineNumbers = Partial<Record<WaLine, string>>;

/**
 * Set by envFrom only on a config built from the numbers overlay (module mode, docs/23): there a line
 * never borrows another line's credentials, so a chat number without a token is not configured.
 */
export interface LineMode {
  readonly linesFromNumbers?: true;
}

/** Each line's driver (docs/19): WA_PROVIDER / WA_CHAT_PROVIDER, meta unless an admin switched it. */
export function lineProvider(env: Env, line: WaLine): WaProvider {
  return line === 'chat' ? env.WA_CHAT_PROVIDER : env.WA_PROVIDER;
}

/**
 * Each line under its own provider. meta: notifications = today's config (appId = WA_APP_ID); chat =
 * its own ids, token fallback (legacy only, chatToken), appId = WA_CHAT_APP_ID (none when unset). kapso: env.kapso.ts
 * kapsoLine (same ids, Kapso base + key). crm: env.crm.ts crmLine (the CRM's base + key, no ids).
 */
export function lineEnvs(env: Env): LineEnvs {
  const base = env.WA_API_BASE?.replace(/\/+$/, '');
  const of = (line: WaLine, meta: () => MetaLineEnv | null): WhatsappEnv | null => {
    const provider = lineProvider(env, line);
    const other: Partial<Record<WaProvider, () => WhatsappEnv | null>> = {
      crm: () => crmLine(env, line),
      kapso: () => kapsoLine(env, line),
      evolution: () => evolutionLine(line),
    };
    return (other[provider] ?? meta)();
  };
  return { notifications: of('notifications', () => metaNotifications(env, base)), chat: of('chat', () => chatEnv(env, base)) };
}

/** null = WhatsApp not configured: the client refuses every call and nothing is sent. */
export function whatsappEnv(env: Env): WhatsappEnv | null {
  return lineEnvs(env).notifications;
}

/**
 * The one send gate (docs/12 §3) for the sender, the schedulers and the inbox: WhatsApp configured
 * and the admin's kill switch (settings.messaging_enabled). There is no env fuse any more (docs/23,
 * owner answer 2): fail-closed, only a stored `true` opens it (a missing or malformed row reads as
 * the registry default, false). Either off → rows stay queued. Notifications line mandatory, chat optional.
 */
export function sendingAllowed(env: Env, messagingEnabledSetting: boolean): boolean {
  return whatsappEnv(env) !== null && messagingEnabledSetting === true;
}

/** POST /webhooks/kapso's HMAC key; never one of the Meta app secrets' routes (docs/19). */
export function kapsoWebhookSecret(env: Env): string | undefined {
  return env.KAPSO_WEBHOOK_SECRET;
}

/**
 * Webhook secrets of the Meta route: distinct, non-blank [WA_APP_SECRET, WA_CHAT_APP_SECRET]. Kept for a
 * line on crm too: its Meta app may still be subscribed (and may sign the chat line), so dropping it would
 * silently lose inbound; a crm line's delivery ticks come via /webhooks/wacrm instead (docs/19).
 */
export function appSecrets(env: Env): string[] {
  const all = [env.WA_APP_SECRET, env.WA_CHAT_APP_SECRET];
  return [...new Set(all.filter((s): s is string => typeof s === 'string' && s.trim() !== ''))];
}

/**
 * The webhook filter. chat = WA_CHAT_PHONE_NUMBER_ID ALONE (no token / WABA / base needed): a
 * half-configured chat line must still receive, since Meta never retries a 200. A line on crm keeps its id
 * here (when set): whatever Meta still delivers for that number is stored, never dropped (docs/19).
 */
export function lineNumbers(env: Env): LineNumbers {
  const { WA_PHONE_NUMBER_ID: notifications, WA_CHAT_PHONE_NUMBER_ID: chat } = env;
  return {
    ...(notifications ? { notifications } : {}),
    ...(chat && chat !== notifications ? { chat } : {}),
  };
}
