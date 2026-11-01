import { z } from 'zod';
import type { FetchLike } from '@/common/infra/http/failure';
import type { KapsoLineEnv } from '@/config/env/env';
import { kapsoPlatformHttp } from './kapso-platform.http';

// Kapso's own conversation record (Platform API v1, owner 2026-10-26): status `active` | `ended`
// (ended after 24 h without activity, or by hand). Switching it back to `active` does NOT reopen
// WhatsApp's 24 h window (only an approved template does); it keeps Kapso's inbox in step with
// ours. The base comes from the line's config (KAPSO_API_BASE, the Meta proxy), never a literal
// host, so local and e2e stay on tools/wa-stub. Same X-API-Key as the proxy.

/** Both calls together, unless the caller gives its own budget (the reopener: 5 s). */
const BUDGET_MS = 10_000;

const listSchema = z.looseObject({
  data: z.array(
    z.looseObject({
      id: z.string().min(1),
      status: z.string().nullish(),
      last_active_at: z.string().nullish(),
      updated_at: z.string().nullish(),
      created_at: z.string().nullish(),
    }),
  ),
});

type Conversation = z.infer<typeof listSchema>['data'][number];

/** Newest first by its last activity (update, then creation, when Kapso leaves it out). */
export function newest(rows: readonly Conversation[]): Conversation | undefined {
  const at = (c: Conversation): number =>
    Date.parse(c.last_active_at ?? c.updated_at ?? c.created_at ?? '') || 0;
  return [...rows].sort((a, b) => at(b) - at(a))[0];
}

interface KapsoReopen {
  env: KapsoLineEnv;
  /** E.164; Kapso is asked by its digits. */
  phone: string;
  fetch?: FetchLike;
  /** One deadline for the list and the PATCH together (default 10 s). */
  timeoutMs?: number;
}

/** Any JSON answer, as before (`res.json()`): a non-JSON 2xx (the core's null) is a failure. */
const answerSchema = z.unknown().refine((body) => body !== null);

/** What is left of the shared budget, for the next call. */
const leftOf = (until: number): number => Math.max(0, until - Date.now());

/**
 * The phone's newest conversation on this line's number, switched to `active` only when it is
 * `ended`. false = none, or the newest is already active (an older ended one is never revived:
 * two reopens in a row would otherwise wake one more old thread each time). Throws on a Kapso
 * failure (the caller logs it and goes on).
 */
export async function reopenKapsoConversation(input: KapsoReopen): Promise<boolean> {
  const until = Date.now() + (input.timeoutMs ?? BUDGET_MS);
  const http = kapsoPlatformHttp(input.env, input.fetch);
  const query = {
    phone_number: input.phone.replace(/\D/g, ''),
    phone_number_id: input.env.phoneNumberId,
    limit: '5',
  };
  const list = await http.json({ path: '', query, schema: listSchema, timeoutMs: leftOf(until) });
  const target = newest(list.data);
  if (target?.status !== 'ended') return false;
  await http.json({
    path: encodeURIComponent(target.id),
    method: 'PATCH',
    json: { whatsapp_conversation: { status: 'active' } },
    schema: answerSchema,
    timeoutMs: leftOf(until),
  });
  return true;
}
