import { waIdToE164 } from '@ab/shared';
import { Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { Ticker } from '@/common/jobs';
import { BackgroundJob } from '@/config/role/background-job';
import type { CrmLookup, CrmMessage } from '@/modules/messaging/whatsapp';
import { CrmConfirm, type Pending } from './crm-confirm.service';
import { LOOKBACK_MS, type UncertainRow } from './crm-match';

// The fallback when the CRM's status webhook was missed or not linked (docs/19 «Confirming an
// uncertain send»): every 5 minutes, the crm rows still uncertain are looked up by phone in the CRM
// and matched by the SAME matcher as the webhook. Never a resend; a lookup failure ends the pass
// (the next one retries).

export const EVERY_MS = 5 * 60_000;
/** Not on boot: every API test boots AppModule (the AlertsJob rule). */
const FIRST_RUN_MS = 3 * 60_000;
/** A row younger than this may still get its webhook: left to it. */
const MIN_AGE_MS = 2 * 60_000;
/** Rows looked up per pass (each costs 3+ CRM calls; the CRM allows 120 a minute). */
export const MAX_ROWS = 10;
/** Every uncertain row read, so a look-alike outside the pass still makes a match ambiguous. */
const READ_ROWS = 100;
const MAX_CONVERSATIONS = 3;

const oldEnough =
  (cutoff: number) =>
  (r: UncertainRow): boolean =>
    Date.parse(r.created_at) <= cutoff;

@BackgroundJob({ name: 'crm-confirm-sweep' })
@Injectable()
export class CrmConfirmSweepJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly ticker = new Ticker({
    name: CrmConfirmSweepJob.name,
    firstMs: FIRST_RUN_MS,
    everyMs: EVERY_MS,
    run: () => this.runOnce(),
  });

  constructor(private readonly confirm: CrmConfirm) {}

  onApplicationBootstrap(): void {
    this.ticker.start();
  }

  onModuleDestroy(): void {
    this.ticker.stop();
  }

  /** One pass; never throws. The rows confirmed. */
  async runOnce(now = new Date()): Promise<number> {
    const span = { since: new Date(now.getTime() - LOOKBACK_MS), until: now, limit: READ_ROWS };
    return this.confirm.guarded(async () => {
      const p = await this.confirm.pending(span);
      return p ? this.pass(p, now.getTime() - MIN_AGE_MS) : 0;
    }, 0);
  }

  private async pass(p: Pending, cutoff: number): Promise<number> {
    let rows = p.rows;
    let confirmed = 0;
    for (const row of p.rows.filter(oldEnough(cutoff)).slice(0, MAX_ROWS)) {
      const done = await this.row({ lookup: p.lookup, rows }, row);
      rows = done ? rows.filter((r) => r.id !== row.id) : rows;
      confirmed += done ? 1 : 0;
    }
    return confirmed;
  }

  /**
   * The row's contact by its exact E.164, its conversations' newest messages, ONE of them its
   * match.
   */
  private async row(p: Pending, row: UncertainRow): Promise<boolean> {
    const contacts = await p.lookup.contacts(row.phone_e164.replace(/\D/g, ''));
    const contact = contacts.find((c) => waIdToE164(c.phone ?? '') === row.phone_e164);
    if (!contact) return false;
    const items = await messagesOf(p.lookup, contact.id);
    const matcher = await this.confirm.matcher(
      p.rows,
      items.flatMap((i) => i.whatsapp_message_id ?? []),
    );
    const hits = items.filter((i) => matcher(i, contact.phone).row?.id === row.id);
    const [item] = hits;
    if (!item) return false;
    return this.confirm.write(
      { row: hits.length === 1 ? row : null, count: hits.length },
      { item },
    );
  }
}

async function messagesOf(lookup: CrmLookup, contactId: string): Promise<CrmMessage[]> {
  const ids = (await lookup.conversationsOf(contactId)).slice(0, MAX_CONVERSATIONS);
  const out: CrmMessage[] = [];
  for (const id of ids) out.push(...(await lookup.messages(id)));
  return out;
}
