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
/** A webhook URL: https anywhere; http only to localhost or a one-word host (a docker service). */
const HOOK_RE = /^(https:\/\/[A-Za-z0-9.-]+|http:\/\/(localhost|127\.0\.0\.1|[A-Za-z0-9_-]+))(:\d{1,5})?\/[A-Za-z0-9._~/-]*$/;

/** /settings/set: Evolution's instance behaviour (groups ignored, nothing automatic). */
export const evolutionBehaviourSchema = z.object({
  reject_call: z.boolean().default(false),
  msg_call: z.string().trim().max(500).default(''),
  groups_ignore: z.boolean().default(true),
  always_online: z.boolean().default(false),
  read_messages: z.boolean().default(false),
  read_status: z.boolean().default(false),
  sync_full_history: z.boolean().default(false),
});

/** /webhook/set. url null = not pushed yet (the form names our path). */
export const evolutionWebhookSchema = z
  .object({
    enabled: z.boolean().default(true),
    url: z.string().trim().max(500).regex(HOOK_RE, 'webhook_url').nullable().default(null),
    by_events: z.boolean().default(false),
    base64: z.boolean().default(false),
    events: z.array(z.enum(EVOLUTION_EVENTS)).min(1).max(EVOLUTION_EVENTS.length)
      .default([...EVOLUTION_DEFAULT_EVENTS]),
  })
  .refine((w) => !w.enabled || w.url !== null, { message: 'webhook_url', path: ['url'] });

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

/** Each send: the typing delay (sendText `delay`) and the link preview. */
export const evolutionSendingSchema = z.object({
  delay_ms: z.number().int().min(0).max(15_000).default(0),
  link_preview: z.boolean().default(false),
});

/** The platform's own knobs: pacing gap and daily cap of sends (Baileys). */
export const evolutionLimitsSchema = z.object({
  gap_ms: z.number().int().min(0).max(60_000).default(EVOLUTION_GAP_DEFAULT),
  daily_cap: z.number().int().min(1).max(10_000).default(EVOLUTION_DAILY_CAP_DEFAULT),
});

/** A Cloud instance's Meta ids (its access token is the secret evolution_cloud_token). */
export const evolutionCloudSchema = z.object({
  phone_number_id: z.string().trim().regex(/^\d{1,32}$/, 'invalid_id').nullable().default(null),
  business_id: z.string().trim().regex(/^\d{1,32}$/, 'invalid_id').nullable().default(null),
});

/** PUT /admin/numbers/:id/evolution/config, and wa_numbers.evolution_config. */
export const evolutionConfigSchema = z.object({
  behaviour: evolutionBehaviourSchema.default(evolutionBehaviourSchema.parse({})),
  webhook: evolutionWebhookSchema.default(evolutionWebhookSchema.parse({ enabled: false })),
  proxy: evolutionProxySchema.default(evolutionProxySchema.parse({})),
  sending: evolutionSendingSchema.default(evolutionSendingSchema.parse({})),
  limits: evolutionLimitsSchema.default(evolutionLimitsSchema.parse({})),
  cloud: evolutionCloudSchema.default(evolutionCloudSchema.parse({})),
});
export type EvolutionConfig = z.infer<typeof evolutionConfigSchema>;

/** A stored value read back: anything unreadable falls back to the safe defaults. */
export const evolutionConfigOf = (raw: unknown): EvolutionConfig =>
  evolutionConfigSchema.safeParse(raw ?? {}).data ?? evolutionConfigSchema.parse({});

/** The four things pushed to Evolution, each read back after the push. */
export const EVOLUTION_SYNC_PARTS = ['instance', 'settings', 'webhook', 'proxy'] as const;
export type EvolutionSyncPart = (typeof EVOLUTION_SYNC_PARTS)[number];
/** synced = read back equal; drift = read back different; failed = Evolution refused / unreachable. */
export const EVOLUTION_SYNC_STATES = ['synced', 'drift', 'failed', 'skipped'] as const;
export type EvolutionSyncState = (typeof EVOLUTION_SYNC_STATES)[number];

/** The last push (wa_numbers.evolution_sync): «متزامن / غير متزامن» per part. */
export const evolutionSyncSchema = z.object({
  synced: z.boolean(),
  checked_at: z.string(),
  parts: z.record(z.enum(EVOLUTION_SYNC_PARTS), z.enum(EVOLUTION_SYNC_STATES)),
});
export type EvolutionSyncView = z.infer<typeof evolutionSyncSchema>;
export const evolutionSyncOf = (raw: unknown): EvolutionSyncView | null =>
  evolutionSyncSchema.safeParse(raw).data ?? null;
