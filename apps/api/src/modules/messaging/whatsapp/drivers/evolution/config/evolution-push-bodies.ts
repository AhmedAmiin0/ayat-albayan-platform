import type { EvolutionConfig, EvolutionMode } from '@ab/shared';
import { z } from 'zod';

// What the API pushes to Evolution API v2 for one number (owner 2026-11-06, docs/19 «Evolution
// driver»), from Evolution's DTOs at commit fa09d37: /settings/set (SettingsDto), /webhook/set
// ({webhook: {...}}), /proxy/set (ProxyDto: port is a string), /instance/create (InstanceDto).
// Pure: no value here is ever logged; the token and the proxy password ride only in the bodies.

export type Body = Record<string, unknown>;

/** POST /settings/set/{instance}. */
export function settingsBody(c: EvolutionConfig): Body {
  const b = c.behaviour;
  return {
    rejectCall: b.reject_call, msgCall: b.msg_call, groupsIgnore: b.groups_ignore,
    alwaysOnline: b.always_online, readMessages: b.read_messages, readStatus: b.read_status,
    syncFullHistory: b.sync_full_history,
  };
}

/** POST /webhook/set/{instance}: our route, with the instance key as x-evolution-token. */
export function webhookBody(c: EvolutionConfig, token: string): Body {
  const w = c.webhook;
  return {
    webhook: {
      enabled: w.enabled, url: w.url, headers: { 'x-evolution-token': token },
      byEvents: w.by_events, base64: w.base64, events: [...w.events],
    },
  };
}

/** Evolution's schema wants host/port/protocol non-empty even when off (it blanks them itself). */
const PROXY_OFF: Body = { enabled: false, host: 'off', port: '1', protocol: 'http' };

/** POST /proxy/set/{instance}. */
export function proxyBody(c: EvolutionConfig, password: string | null): Body {
  const p = c.proxy;
  if (!p.enabled) return PROXY_OFF;
  return {
    enabled: true, host: p.host, port: String(p.port ?? ''), protocol: p.protocol,
    username: p.username, password: password ?? '',
  };
}

const INTEGRATION: Record<EvolutionMode, string> = {
  baileys: 'WHATSAPP-BAILEYS',
  cloud: 'WHATSAPP-BUSINESS',
};

/** POST /instance/create (global key): no QR now, the admin asks for it from the QR panel. */
export function createBody(at: {
  instance: string;
  mode: EvolutionMode;
  token: string;
  config: EvolutionConfig;
}): Body {
  const cloud = at.config.cloud;
  const ids = at.mode === 'cloud'
    ? { number: cloud.phone_number_id ?? '', businessId: cloud.business_id ?? '' }
    : {};
  return {
    instanceName: at.instance, integration: INTEGRATION[at.mode], token: at.token,
    qrcode: false, ...ids, ...settingsBody(at.config),
  };
}

// Read back (…/find/{instance}): lenient, only the fields we set.

export const settingsFound = z.looseObject({
  rejectCall: z.boolean().nullish(), msgCall: z.string().nullish(),
  groupsIgnore: z.boolean().nullish(), alwaysOnline: z.boolean().nullish(),
  readMessages: z.boolean().nullish(), readStatus: z.boolean().nullish(),
  syncFullHistory: z.boolean().nullish(),
}).nullable();

export const webhookFound = z.looseObject({
  enabled: z.boolean().nullish(), url: z.string().nullish(), events: z.unknown(),
  webhookByEvents: z.boolean().nullish(), webhookBase64: z.boolean().nullish(),
}).nullable();

/** The password is never read back into memory: the schema drops it. */
export const proxyFound = z.object({
  enabled: z.boolean().nullish(), host: z.string().nullish(), port: z.string().nullish(),
  protocol: z.string().nullish(), username: z.string().nullish(),
}).nullable();
