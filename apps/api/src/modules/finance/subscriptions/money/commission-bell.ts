import { formatAmount } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { ar } from '../../../../common/i18n/server-text';
import { PushService } from '../../../../common/push/push.service';

/** An earning this recent is news; an older one was told already, or before this bell existed. */
const FRESH_MS = 5 * 60_000;

type Earned = { id: string; assistant_id: string; amount: number; currency: string; student: { code: string | null; name: string } | null };

/** «ج.م» for EGP as the web's currencySymbol; the site currencies' symbols; else the ISO code. Read at send time (overrides). */
function currencyText(currency: string): string {
  const names: Readonly<Record<string, string | undefined>> = { ...ar.pricing.currencies, EGP: ar.payouts.currency };
  return names[currency] ?? currency;
}

/**
 * «عمولة جديدة: +50 ج.م — AB-1022» (owner 2026-10-29): the bell of the assistant a commission was just earned
 * for (its assistant_id, students.brought_by; not the payment's recorder). The database earns it — after a
 * payment or a price change, an admin's attribution, an assistant's new terms — in settle_assistant_commission
 * (migration 751), which writes ONE audit row per earning, 'earn' or 'reinstate'. Earning again after a refund
 * is an UPDATE of the same row (old created_at, same id), so the audit row is the event: after each of those
 * writes this rings every earning of the last FRESH_MS whose commission is still earned, one bell per audit row
 * (the subject; PushService dedups, so a retry or a second caller rings nothing twice). Bell only. Never throws.
 */
@Injectable()
export class CommissionBell {
  private readonly log = new Logger(CommissionBell.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly push: PushService,
  ) {}

  // ponytail: reads the academy's commission audit rows (audit_log_entity_idx leads with entity) to find the last
  // FRESH_MS; fine for thousands of them, an (entity, at) index if they ever reach the hundreds of thousands.
  async notify(now = new Date()): Promise<void> {
    try {
      const events = await this.db
        .from('audit_log')
        .select('id, entity_id')
        .eq('entity', 'assistant_commissions')
        .in('action', ['earn', 'reinstate'])
        .gte('at', new Date(now.getTime() - FRESH_MS).toISOString());
      if (events.error) throw new Error(events.error.message);
      if (events.data.length === 0) return;
      const rows = await this.db
        .from('assistant_commissions')
        .select('id, assistant_id, amount, currency, student:students(code, name)')
        .in('id', [...new Set(events.data.map((e) => e.entity_id))])
        .eq('status', 'earned')
        .overrideTypes<Earned[], { merge: false }>();
      if (rows.error) throw new Error(rows.error.message);
      const byId = new Map(rows.data.map((r) => [r.id, r]));
      for (const e of events.data) {
        const row = byId.get(e.entity_id);
        if (row) await this.ring(e.id, row);
      }
    } catch (e) {
      this.log.warn(`commission bell failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private ring(event: string, row: Earned): Promise<void> {
    // LRI … PDI around the signed number: the RTL body keeps «+50», not «50+».
    const amount = `⁦+${formatAmount(Number(row.amount))}⁩ ${currencyText(row.currency)}`;
    return this.push.notifyProfiles({
      kind: 'commission_earned',
      profileIds: [row.assistant_id],
      subject: event,
      bellOnly: true,
      vars: { amount, code: row.student?.code ?? '', student: row.student?.name ?? '' },
      data: { commissionId: row.id },
    });
  }
}
