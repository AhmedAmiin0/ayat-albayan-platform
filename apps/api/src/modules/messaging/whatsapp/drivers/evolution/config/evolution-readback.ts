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

/** What the webhook was pushed with: the options and the server-built URL. */
interface HookWant {
  config: EvolutionConfig;
  url: string;
}

/** The webhook as set: on/off, our URL, the events, and both flags pinned off. */
const WEBHOOK_CHECKS: readonly ((f: NonNullable<Webhook>, w: HookWant) => boolean)[] = [
  (f, w) => (f.enabled ?? false) === w.config.webhook.enabled,
  (f, w) => (f.url ?? null) === w.url,
  (f, w) => same(sorted(f.events), [...w.config.webhook.events].sort()),
  (f) => !(f.webhookByEvents ?? false),
  (f) => !(f.webhookBase64 ?? false),
];

export const webhookMatch = (found: Webhook, want: HookWant): boolean =>
  found !== null && WEBHOOK_CHECKS.every((check) => check(found, want));

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
