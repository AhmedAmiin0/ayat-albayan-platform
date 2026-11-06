import type { EvolutionConfig } from '@ab/shared';
import type { z } from 'zod';
import {
  settingsBody, type proxyFound, type settingsFound, type webhookFound,
} from './evolution-push-bodies';

// Read back = equal (owner 2026-11-06: «متزامن / غير متزامن»). Pure comparisons of what Evolution
// answers on …/find with the number's stored config; the proxy password is never compared.

type Settings = z.infer<typeof settingsFound>;
type Webhook = z.infer<typeof webhookFound>;
type Proxy = z.infer<typeof proxyFound>;

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Every behaviour field equal (an absent boolean reads as false, an absent text as ''). */
export function settingsMatch(found: Settings, c: EvolutionConfig): boolean {
  const want = settingsBody(c);
  const got: Record<string, unknown> = { ...found };
  const blank = (v: unknown): unknown => (typeof v === 'string' ? '' : false);
  return Object.entries(want).every(([k, v]) => same(got[k] ?? blank(v), v));
}

const sorted = (events: unknown): string[] =>
  Array.isArray(events) ? events.map(String).sort() : [];

type Check<F> = (f: NonNullable<F>, c: EvolutionConfig) => boolean;

/** The webhook as set: on/off, our URL, the events and both flags. */
const WEBHOOK_CHECKS: readonly Check<Webhook>[] = [
  (f, c) => (f.enabled ?? false) === c.webhook.enabled,
  (f, c) => (f.url ?? null) === c.webhook.url,
  (f, c) => same(sorted(f.events), [...c.webhook.events].sort()),
  (f, c) => (f.webhookByEvents ?? false) === c.webhook.by_events,
  (f, c) => (f.webhookBase64 ?? false) === c.webhook.base64,
];

export const webhookMatch = (found: Webhook, c: EvolutionConfig): boolean =>
  found !== null && WEBHOOK_CHECKS.every((check) => check(found, c));

/** The proxy on: host, port, protocol and username equal (never the password). */
const PROXY_CHECKS: readonly Check<Proxy>[] = [
  (f) => f.enabled === true,
  (f, c) => f.host === c.proxy.host && f.port === String(c.proxy.port),
  (f, c) => f.protocol === c.proxy.protocol && (f.username ?? '') === c.proxy.username,
];

const proxyOff = (found: Proxy): boolean => !(found?.enabled ?? false);

/** Off reads as off; on = every proxy check. */
export const proxyMatch = (found: Proxy, c: EvolutionConfig): boolean =>
  c.proxy.enabled
    ? found !== null && PROXY_CHECKS.every((check) => check(found, c))
    : proxyOff(found);
