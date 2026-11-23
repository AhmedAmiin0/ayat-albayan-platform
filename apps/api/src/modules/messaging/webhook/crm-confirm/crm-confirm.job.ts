import { waIdToE164 } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { Ticker, TickerJob } from '@/common/jobs';
import { BackgroundJob } from '@/config/role/background-job';
import type { CrmLookup, CrmMessage } from '@/modules/messaging/whatsapp';
import { CrmConfirm, type Pending } from './crm-confirm.service';
import { LOOKBACK_MS, type UncertainRow } from './crm-match';

// The fallback when the CRM's status webhook was missed or not linked (docs/19 «Confirming an
// uncertain send»): every 5 minutes, the crm rows still uncertain are looked up by phone in the CRM
// and matched by the SAME matcher as the webhook. Never a resend; a lookup failure ends the pass
// (the next one retries).

const EVERY_MS = 5 * 60_000;
/** Not on boot: every API test boots AppModule (the AlertsJob rule). */
const FIRST_RUN_MS = 3 * 60_000;
/** A row younger than this may still get its webhook: left to it. */
const MIN_AGE_MS = 2 * 60_000;
/** Rows looked up per pass (each costs 3+ CRM calls; the CRM allows 120 a minute). */
const MAX_ROWS = 10;
const MAX_CONVERSATIONS = 3;

/** Old enough for the sweep (2 min), still within the lookback (6 h). */
const due =
  (now: number) =>
  (r: UncertainRow): boolean => {
    const age = now - Date.parse(r.created_at);
    return age >= MIN_AGE_MS && age <= LOOKBACK_MS;
  };

@BackgroundJob({ name: 'crm-confirm-sweep' })
@Injectable()
export class CrmConfirmSweepJob extends TickerJob {
  protected readonly ticker = new Ticker({
    name: CrmConfirmSweepJob.name,
    firstMs: FIRST_RUN_MS,
    everyMs: EVERY_MS,
    run: () => this.runOnce(),
  });

  /** row id → when a pass last looked it up: the least recently tried go first (no starving). */
  private tried = new Map<string, number>();

  constructor(@Inject(CrmConfirm) private readonly confirm: CrmConfirm) {
    super();
  }

  /** One pass; never throws. The rows confirmed. */
  async runOnce(now = new Date()): Promise<number> {
    return this.confirm.guarded(async () => {
      const p = await this.confirm.pending(now);
      return p ? this.pass(p, now.getTime()) : 0;
    }, 0);
  }

  /** This pass's rows: due, never tried or tried longest ago first, newest first among equals. */
  private pick(rows: readonly UncertainRow[], now: number): UncertainRow[] {
    const last = (r: UncertainRow): number => this.tried.get(r.id) ?? 0;
    const picked = rows
      .filter(due(now))
      .sort((a, b) => last(a) - last(b))
      .slice(0, MAX_ROWS);
    const kept = rows.flatMap((r): [string, number][] =>
      this.tried.has(r.id) ? [[r.id, last(r)]] : [],
    );
    this.tried = new Map([...kept, ...picked.map((r): [string, number] => [r.id, now])]);
    return picked;
  }

  private async pass(p: Pending, now: number): Promise<number> {
    let rows = p.rows;
    let confirmed = 0;
    for (const row of this.pick(p.rows, now)) {
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
    return this.confirm.confirmRow({ row, items, phone: contact.phone }, p.rows);
  }
}

async function messagesOf(lookup: CrmLookup, contactId: string): Promise<CrmMessage[]> {
  const ids = (await lookup.conversationsOf(contactId)).slice(0, MAX_CONVERSATIONS);
  const out: CrmMessage[] = [];
  for (const id of ids) out.push(...(await lookup.messages(id)));
  return out;
}
