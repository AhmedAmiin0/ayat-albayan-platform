import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { CrmLineEnv } from '@/config/env/env';
import { crmJson } from '@/modules/messaging/whatsapp/drivers/crm/crm-http';
import type { FetchLike } from '@/modules/messaging/whatsapp/drivers/meta/graph';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { bearerOf, keyMatches } from './relay.auth';
import { KeyVerdicts } from './relay.verdicts';

// The script keeps its own CRM key: the CRM holds two keys on one account, the script's and the
// platform's (docs/19 «script relay»). A Bearer that is not the line's key is accepted when the
// CRM answers GET /me for it with the line key's account and the messages:send scope. Verdicts
// are remembered by sha256 (accepted 10 min, refused 1 min) and the line's own account once, so
// a run of reminders costs one check and a wrong key one check a minute.

/** GET /me → {data:{account:{id}, key:{scopes}}}; only what the check compares. */
const meSchema = z.object({
  account: z.object({ id: z.union([z.string().min(1), z.number()]) }),
  key: z.object({ scopes: z.array(z.string()) }),
});

const ACCEPTED_MS = 10 * 60_000;
const REFUSED_MS = 60_000;
const TIMEOUT_MS = 10_000;
const SEND_SCOPE = 'messages:send';

/** The line as the check needs it: its CRM env (base + its own key) and the fetch to reach it. */
interface KeyLine {
  env: CrmLineEnv;
  fetch: FetchLike;
}

interface Candidate {
  id: string;
  token: string;
  line: KeyLine;
}

const ttl = (ok: boolean): number => (ok ? ACCEPTED_MS : REFUSED_MS);

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
  private readonly verdicts = new KeyVerdicts();
  /** The line key's sha256 → its CRM account id, which never changes for a key. */
  private readonly owners = new Map<string, string>();

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
    return this.verdicts.of(id, now) ?? this.check({ id, token, line }, now);
  }

  /** A refusal caused by the line's own key failing /me is not the candidate's: not remembered. */
  private async check(key: Candidate, now: number): Promise<boolean> {
    const theirs = await sendingAccount(key.line, key.token);
    const own = theirs === null ? undefined : await this.ownAccount(key.line);
    const ok = theirs !== null && theirs === own;
    if (own !== null) this.verdicts.remember(key.id, { ok, until: now + ttl(ok) });
    return ok;
  }

  private async ownAccount(line: KeyLine): Promise<string | null> {
    const lineKey = digest(line.env.apiKey);
    const known = this.owners.get(lineKey);
    if (known !== undefined) return known;
    const id = await sendingAccount(line, line.env.apiKey);
    if (id !== null) this.owners.set(lineKey, id);
    return id;
  }
}
