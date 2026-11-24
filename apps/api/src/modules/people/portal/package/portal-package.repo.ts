import type { PortalPayment } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

/** A family's payment history is short; a long one shows its newest rows. */
const PAYMENTS_LIMIT = 100;
const PAYMENT_SELECT = 'paid_at, amount, currency, kind, subscription:subscriptions!inner(student_id)';

/** The balance itself is the staff one, mapped for the family. */
@Injectable()
export class PortalPackageRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * The student's payments over every package, newest first: date, amount, currency and kind only
   * (never the receipt, the note, the method or who recorded it).
   */
  async payments(studentId: string): Promise<PortalPayment[]> {
    const { data, error } = await this.db
      .from('payments')
      .select(PAYMENT_SELECT)
      .eq('subscription.student_id', studentId)
      .order('paid_at', { ascending: false })
      .limit(PAYMENTS_LIMIT);
    if (error) throw dbError(error);
    return data.map((p) => ({
      paid_at: p.paid_at,
      amount: p.amount,
      currency: p.currency,
      kind: p.kind,
    }));
  }
}
