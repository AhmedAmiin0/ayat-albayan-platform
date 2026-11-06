import { z } from 'zod';

// Every Evolution option of one number (owner 2026-11-06: «make all the evolution api options
// configurable»; docs/19 «Evolution driver»). Stored in wa_numbers.evolution_config (no secret:
// the instance token, the Cloud access token and the proxy password are number secrets in Vault)
// and pushed to Evolution on save: /settings/set, /webhook/set, /proxy/set.

/** Evolution v2's webhook events (EventController.events). */
export const EVOLUTION_EVENTS = [
  'APPLICATION_STARTUP', 'QRCODE_UPDATED', 'MESSAGES_SET', 'MESSAGES_UPSERT', 'MESSAGES_EDITED',
  'MESSAGES_UPDATE', 'MESSAGES_DELETE', 'SEND_MESSAGE', 'SEND_MESSAGE_UPDATE', 'CONTACTS_SET',
  'CONTACTS_UPSERT', 'CONTACTS_UPDATE', 'PRESENCE_UPDATE', 'CHATS_SET', 'CHATS_UPSERT',
  'CHATS_UPDATE', 'CHATS_DELETE', 'GROUPS_UPSERT', 'GROUP_UPDATE', 'GROUP_PARTICIPANTS_UPDATE',
  'CONNECTION_UPDATE', 'LABELS_EDIT', 'LABELS_ASSOCIATION', 'CALL', 'REMOVE_INSTANCE',
  'LOGOUT_INSTANCE', 'INSTANCE_CREATE', 'INSTANCE_DELETE', 'STATUS_INSTANCE',
] as const;
export type EvolutionEvent = (typeof EVOLUTION_EVENTS)[number];

/** What the platform reads: inbound, ticks (and late refusals), sends, the connection. */
export const EVOLUTION_DEFAULT_EVENTS: readonly EvolutionEvent[] = [
  'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE', 'CONNECTION_UPDATE', 'QRCODE_UPDATED',
];

export const EVOLUTION_PROXY_PROTOCOLS = ['http', 'https', 'socks4', 'socks5'] as const;

/** Defaults of the pacing gap and the daily cap of a Baileys number (ban risk). */
export const EVOLUTION_GAP_DEFAULT = 3_000;
export const EVOLUTION_DAILY_CAP_DEFAULT = 60;

/** A host name or IPv4 (no scheme, no port, no path). */
const HOST_RE = /^[A-Za-z0-9.-]{1,100}$/;

/** WhatsApp ERRORs on our sends within this window that switch the number off (default 3). */
export const EVOLUTION_ERROR_WINDOW_MS = 15 * 60_000;
export const EVOLUTION_ERROR_TRIP_DEFAULT = 3;

/**
 * Where Evolution posts a number's events: never typed by an admin (the header carries the
 * instance token). `internal` = the stack's load balancer on the docker network, `public` = the
 * API's public origin (API_PUBLIC_URL). The server builds the URL; the UI only shows it.
 */
export const EVOLUTION_HOOK_ORIGINS = ['internal', 'public'] as const;
export type EvolutionHookOrigin = (typeof EVOLUTION_HOOK_ORIGINS)[number];
/** deploy/staging: ayat-lb listens on :8080 and balances the API copies (docs/09). */
export const EVOLUTION_HOOK_INTERNAL = 'http://ayat-lb:8080';

/** The only path a number's webhook points at: our route for its own instance. */
export const evolutionHookPath = (instance: string): string =>
  `/webhooks/evolution/${encodeURIComponent(instance)}`;

/** The webhook URL for an origin (null = that origin is not configured: nothing is pushed). */
export const evolutionHookUrl = (origin: string | null, instance: string): string | null =>
  (origin === null ? null : `${origin}${evolutionHookPath(instance)}`);

/**
 * /settings/set: Evolution's instance behaviour (groups ignored, nothing automatic). No
 * `always_online` (owner 2026-11-06: families never see us «online»): the push pins it off, and a
 * stored value is dropped on read.
 */
export const evolutionBehaviourSchema = z.object({
  reject_call: z.boolean().default(false),
  msg_call: z.string().trim().max(500).default(''),
  groups_ignore: z.boolean().default(true),
  read_messages: z.boolean().default(false),
  read_status: z.boolean().default(false),
  sync_full_history: z.boolean().default(false),
});

/**
 * /webhook/set: on by default (no inbound without it). The URL is the server's (origin + our
 * path); byEvents and base64 are always false (a per-event path is 404 here, base64 media passes
 * the body limit), so neither is an option.
 */
export const evolutionWebhookSchema = z.object({
  enabled: z.boolean().default(true),
  origin: z.enum(EVOLUTION_HOOK_ORIGINS).default('internal'),
  events: z.array(z.enum(EVOLUTION_EVENTS)).min(1).max(EVOLUTION_EVENTS.length)
    .default([...EVOLUTION_DEFAULT_EVENTS]),
});

/** /proxy/set (the password is the number secret evolution_proxy_password). */
export const evolutionProxySchema = z
  .object({
    enabled: z.boolean().default(false),
    host: z.string().trim().regex(HOST_RE, 'proxy_host').or(z.literal('')).default(''),
    port: z.number().int().min(1).max(65_535).nullable().default(null),
    protocol: z.enum(EVOLUTION_PROXY_PROTOCOLS).default('http'),
    username: z.string().trim().max(100).default(''),
  })
  .refine((p) => !p.enabled || (p.host !== '' && p.port !== null), {
    message: 'proxy_needed', path: ['host'],
  });

/**
 * Each send: the link preview. No typing delay (owner 2026-11-06: «dont make the family see
 * typing»): Evolution's `delay` shows «يكتب…» to the family, so it is never sent; an old stored
 * `delay_ms` is dropped on read (zod strips unknown keys).
 */
export const evolutionSendingSchema = z.object({
  link_preview: z.boolean().default(false),
});

/** The platform's own knobs: pacing gap, daily cap (Baileys), ERRORs that switch it off. */
export const evolutionLimitsSchema = z.object({
  gap_ms: z.number().int().min(0).max(60_000).default(EVOLUTION_GAP_DEFAULT),
  daily_cap: z.number().int().min(1).max(10_000).default(EVOLUTION_DAILY_CAP_DEFAULT),
  error_trip: z.number().int().min(1).max(50).default(EVOLUTION_ERROR_TRIP_DEFAULT),
});

/** A Cloud instance's Meta ids (its access token is the secret evolution_cloud_token). */
export const evolutionCloudSchema = z.object({
  phone_number_id: z.string().trim().regex(/^\d{1,32}$/, 'invalid_id').nullable().default(null),
  business_id: z.string().trim().regex(/^\d{1,32}$/, 'invalid_id').nullable().default(null),
});

/** PUT /admin/numbers/:id/evolution/config, and wa_numbers.evolution_config. */
export const evolutionConfigSchema = z.object({
  behaviour: evolutionBehaviourSchema.default(evolutionBehaviourSchema.parse({})),
  webhook: evolutionWebhookSchema.default(evolutionWebhookSchema.parse({})),
  proxy: evolutionProxySchema.default(evolutionProxySchema.parse({})),
  sending: evolutionSendingSchema.default(evolutionSendingSchema.parse({})),
  limits: evolutionLimitsSchema.default(evolutionLimitsSchema.parse({})),
  cloud: evolutionCloudSchema.default(evolutionCloudSchema.parse({})),
});
export type EvolutionConfig = z.infer<typeof evolutionConfigSchema>;

const storedSchema = z.record(z.string(), z.unknown());
/** One section read back; unreadable = that section's defaults only. */
const sectionOf = <S extends z.ZodType>(schema: S, raw: unknown): z.output<S> =>
  schema.safeParse(raw).data ?? schema.parse(undefined);

/**
 * A stored value read back section by section: one unreadable section (e.g. a gap over the
 * cap) falls back to its own defaults, never resetting the proxy or the others.
 */
export function evolutionConfigOf(raw: unknown): EvolutionConfig {
  const o = storedSchema.safeParse(raw).data ?? {};
  const s = evolutionConfigSchema.shape;
  return {
    behaviour: sectionOf(s.behaviour, o.behaviour), webhook: sectionOf(s.webhook, o.webhook),
    proxy: sectionOf(s.proxy, o.proxy), sending: sectionOf(s.sending, o.sending),
    limits: sectionOf(s.limits, o.limits), cloud: sectionOf(s.cloud, o.cloud),
  };
}
