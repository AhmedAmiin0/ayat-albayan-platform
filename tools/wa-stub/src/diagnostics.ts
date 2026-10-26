// Read-only Graph calls of «افحص الخطوط» (docs/12 §13.9, §13.12): GET /{phone_number_id}?fields=
// and GET /{waba}/subscribed_apps, plus POST /__stub/lines/{pn} to play an unhealthy number.
import type { IncomingMessage } from 'node:http';
import { initialHealth, stubLines } from './lines.ts';
import { ERR, type Json } from './providers/meta.ts';
import { readJson, type LineHealth, type Reply, type Route, type StubState } from './state.ts';

export const PHONE_FIELDS = [
  'display_phone_number',
  'verified_name',
  'quality_rating',
  'status',
  'name_status',
  'code_verification_status',
] as const;

/** GET /{id} when `id` is a configured phone-number id; null = not a number (the media lookup). */
export function phoneInfo(req: IncomingMessage, s: StubState, id: string): Reply | null {
  const health = s.health.get(id);
  if (!health) return null;
  const asked = new URL(req.url ?? '/', 'http://stub').searchParams.get('fields');
  const wanted = asked ? asked.split(',').map((f) => f.trim()) : [...PHONE_FIELDS];
  const info: Json = { id };
  for (const field of PHONE_FIELDS) if (wanted.includes(field)) info[field] = health[field];
  return [200, info];
}

/** GET /{waba}/subscribed_apps: the line's app while subscribed, else an empty list. */
function subscribedApps(s: StubState, wabaId: string): Reply {
  const line = stubLines(s.opts).find((l) => l.wabaId === wabaId);
  if (!line) return [400, ERR.noObject(wabaId)];
  const health = s.health.get(line.phoneNumberId);
  if (!health?.subscribed) return [200, { data: [] }];
  const app: Json = { id: line.appId, name: `Stub app ${line.appId}`, link: `https://stub.local/apps/${line.appId}` };
  // Meta's shape: the override sits NEXT TO whatsapp_business_api_data (review B, F1).
  const item: Json = { whatsapp_business_api_data: app };
  if (health.override_callback_uri) item['override_callback_uri'] = health.override_callback_uri;
  return [200, { data: [item] }];
}

const V = String.raw`\/v\d+\.\d+`;
export const diagnosticRoutes: Route[] = [
  ['GET', new RegExp(`^${V}/([^/]+)/subscribed_apps$`), async (_r, m, s) => subscribedApps(s, m[1] ?? '')],
];

const TEXT_FIELDS = [...PHONE_FIELDS, 'override_callback_uri'] as const;

/** Applies a POST /__stub/lines/{pn} body: `subscribed` and any of the text fields. */
function patchHealth(health: LineHealth, body: Json): LineHealth {
  const next: LineHealth = { ...health };
  if (typeof body['subscribed'] === 'boolean') next.subscribed = body['subscribed'];
  for (const field of TEXT_FIELDS) if (typeof body[field] === 'string') next[field] = body[field];
  return next;
}

/** Restores every configured line to healthy and subscribed (/__stub/reset). */
export function resetHealth(s: StubState): void {
  s.health = initialHealth(s.opts);
}

export const diagnosticControlRoutes: Route[] = [
  ['POST', /^\/__stub\/lines\/([^/]+)$/, async (req, m, s) => {
    const pn = m[1] ?? '';
    const health = s.health.get(pn);
    if (!health) return [404, { error: `no line ${pn}` }];
    const next = patchHealth(health, await readJson(req));
    s.health.set(pn, next);
    return [200, next];
  }],
];
