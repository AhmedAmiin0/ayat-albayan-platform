import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { CrmLineEnv } from '@/config/env/env';
import { crmJson } from '@/modules/messaging/whatsapp/drivers/crm/crm-http';
import type { FetchLike } from '@/modules/messaging/whatsapp/drivers/meta/graph';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { bearerOf, keyMatches } from './relay.auth';

// The script keeps its OWN CRM key (owner 2026-11-01 «old key is valid»): the CRM holds two
// keys on one account, the script's and the platform's. A Bearer that is not the line's key is
// accepted when the CRM itself answers GET /me for it with the line key's account and the
// messages:send scope. An accepted key is remembered (as its sha256) for TTL_MS, so a run of
// reminders costs one check.

/** GET /me → {data:{account:{id}, key:{scopes}}}; only what the check compares. */
const meSchema = z.object({
  account: z.object({ id: z.union([z.string().min(1), z.number()]) }),
  key: z.object({ scopes: z.array(z.string()) }),
});

const TTL_MS = 10 * 60_000;
const TIMEOUT_MS = 10_000;
const SEND_SCOPE = 'messages:send';

/** The line as the check needs it: its CRM env (base + its own key) and the fetch to reach it. */
interface KeyLine {
  env: CrmLineEnv;
  fetch: FetchLike;
}

const digest = (token: string): string => createHash('sha256').update(token, 'utf8').digest('hex');

/**
 * The account id the CRM reports for this key when it may send; null when the CRM refuses the
 * key (401 / 403) or the key lacks messages:send. A network error or 5xx throws.
 */
async function sendingAccount(line: KeyLine, apiKey: string): Promise<string | null> {
  const conn = { env: { ...line.env, apiKey }, fetch: line.fetch, timeoutMs: TIMEOUT_MS };
  const data = await crmJson(conn, { path: 'me' }).catch((e: unknown) => {
    if (e instanceof WaError && e.info.credential === 'crm') return null;
    throw e;
  });
  const me = meSchema.safeParse(data);
  if (!me.success || !me.data.key.scopes.includes(SEND_SCOPE)) return null;
  return String(me.data.account.id);
}

export class RelayKeys {
  // ponytail: refused keys are not remembered, so each wrong key costs a GET /me; add a short
  // negative cache if the CRM starts answering 429.
  private readonly until = new Map<string, number>();

  /** The line's own key, or another key of the same CRM account that may send. */
  async accepts(
    header: string | undefined,
    line: KeyLine,
    now: number = Date.now(),
  ): Promise<boolean> {
    const token = bearerOf(header);
    if (token === null) return false;
    if (keyMatches(header, line.env.apiKey)) return true;
    const id = digest(token);
    if ((this.until.get(id) ?? 0) > now) return true;
    const theirs = await sendingAccount(line, token);
    const same = theirs !== null && theirs === (await sendingAccount(line, line.env.apiKey));
    if (same) this.until.set(id, now + TTL_MS);
    return same;
  }
}
