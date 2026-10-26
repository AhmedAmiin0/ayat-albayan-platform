import { z } from 'zod';
import type { KapsoLineEnv } from '../../../../../config/env/env';
import type { FetchLike } from '../meta/graph';

// Kapso's own conversation record (Platform API v1, owner 2026-10-26): status `active` | `ended`
// (ended after 24 h without activity, or by hand). Switching it back to `active` does NOT reopen
// WhatsApp's 24 h window (only an approved template does); it keeps Kapso's inbox in step with ours.
// The base comes from the line's config (KAPSO_API_BASE, the Meta proxy), never a literal host, so
// local and e2e stay on tools/wa-stub. Same X-API-Key as the proxy.

const TIMEOUT_MS = 10_000;

const listSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().min(1),
      last_active_at: z.string().nullish(),
      updated_at: z.string().nullish(),
      created_at: z.string().nullish(),
    }),
  ),
});

type Conversation = z.infer<typeof listSchema>['data'][number];

/** The Platform API next to the Meta proxy: …/meta/whatsapp → …/platform/v1 (any other base: base/platform/v1). */
export function platformBase(proxyBase: string): string {
  const base = proxyBase.replace(/\/+$/, '');
  return /\/meta\/whatsapp$/.test(base) ? base.replace(/\/meta\/whatsapp$/, '/platform/v1') : `${base}/platform/v1`;
}

/** Newest first by its last activity (update, then creation, when Kapso leaves it out). */
export function newest(rows: readonly Conversation[]): Conversation | undefined {
  const at = (c: Conversation) => Date.parse(c.last_active_at ?? c.updated_at ?? c.created_at ?? '') || 0;
  return [...rows].sort((a, b) => at(b) - at(a))[0];
}

async function call(fetch: FetchLike, req: { env: KapsoLineEnv; url: string; init?: RequestInit }): Promise<unknown> {
  const headers = { 'x-api-key': req.env.apiKey, accept: 'application/json', 'content-type': 'application/json' };
  const res = await fetch(req.url, { ...req.init, headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  // The body is never echoed into the error: it may carry the family's number.
  if (!res.ok) throw new Error(`Kapso HTTP ${res.status}`);
  return res.json();
}

interface KapsoReopen {
  env: KapsoLineEnv;
  /** E.164; Kapso is asked by its digits. */
  phone: string;
  fetch?: FetchLike;
}

/**
 * The phone's newest `ended` conversation on this line's number, switched to `active`. false = none
 * ended. Throws on a Kapso failure (the caller logs it and goes on).
 */
export async function reopenKapsoConversation(input: KapsoReopen): Promise<boolean> {
  const fetch = input.fetch ?? globalThis.fetch;
  const base = `${platformBase(input.env.base)}/whatsapp/conversations`;
  const q = new URLSearchParams({
    phone_number: input.phone.replace(/\D/g, ''),
    phone_number_id: input.env.phoneNumberId,
    status: 'ended',
    limit: '5',
  });
  const list = listSchema.safeParse(await call(fetch, { env: input.env, url: `${base}?${q}` }));
  if (!list.success) throw new Error('Kapso conversations: unexpected list body');
  const target = newest(list.data.data);
  if (!target) return false;
  const body = JSON.stringify({ whatsapp_conversation: { status: 'active' } });
  await call(fetch, { env: input.env, url: `${base}/${encodeURIComponent(target.id)}`, init: { method: 'PATCH', body } });
  return true;
}
