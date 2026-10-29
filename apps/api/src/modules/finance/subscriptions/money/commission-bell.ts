import { formatAmount } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { ar } from '../../../../common/i18n/server-text';
import { PushService } from '../../../../common/push/push.service';

/** A commission inserted this recently is news; older rows were told already, or before this bell existed. */
const FRESH_MS = 5 * 60_000;

type Fresh = { id: string; assistant_id: string; amount: number; currency: string; student: { code: string | null; name: string } | null };

/** «ج.م» for EGP as the web's currencySymbol; the site currencies' symbols; else the ISO code. Read at send time (overrides). */
function currencyText(currency: string): string {
  const names: Readonly<Record<string, string | undefined>> = { ...ar.pricing.currencies, EGP: ar.payouts.currency };
  return names[currency] ?? currency;
}

/**
 * «عمولة جديدة: +50 ج.م — AB-1022» (owner 2026-10-29): the bell of the assistant who brought the student
 * (the commission's assistant_id, students.brought_by; not the payment's recorder) when a money write
 * earned a commission. The database earns it (the payments triggers, migration 272) before MoneyWrites
 * runs, so after each write this looks for the student's commissions inserted in the last FRESH_MS.
 * created_at, not updated_at: a statement rebuild touches old rows. One bell per commission (the subject is
 * its id, PushService dedups), bell only (no WhatsApp, no push). Never throws.
 */
@Injectable()
export class CommissionBell {
  private readonly log = new Logger(CommissionBell.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly push: PushService,
  ) {}

  async notify(studentId: string, now = new Date()): Promise<void> {
    try {
      const { data, error } = await this.db
        .from('assistant_commissions')
        .select('id, assistant_id, amount, currency, student:students(code, name)')
        .eq('student_id', studentId)
        .eq('status', 'earned')
        .gte('created_at', new Date(now.getTime() - FRESH_MS).toISOString())
        .overrideTypes<Fresh[], { merge: false }>();
      if (error) throw new Error(error.message);
      for (const row of data) await this.ring(row);
    } catch (e) {
      this.log.warn(`commission bell for ${studentId} failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private ring(row: Fresh): Promise<void> {
    return this.push.notifyProfiles({
      kind: 'commission_earned',
      profileIds: [row.assistant_id],
      subject: row.id,
      bellOnly: true,
      vars: { amount: `+${formatAmount(Number(row.amount))} ${currencyText(row.currency)}`, code: row.student?.code ?? '', student: row.student?.name ?? '' },
      data: { commissionId: row.id },
    });
  }
}
