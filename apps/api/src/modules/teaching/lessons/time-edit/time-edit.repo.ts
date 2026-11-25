import type { PayoutStatus } from '@ab/catalog';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { maybe } from '@/common/db/errors';

/** The one read the time edit needs beyond the lesson (service role; the controller guards). */
@Injectable()
export class TimeEditRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The teacher's payout status for `YYYY-MM`, null when that month has no payout row yet. */
  async payoutStatus(teacherId: string, month: string): Promise<PayoutStatus | null> {
    const data = maybe(await this.db
      .from('teacher_payouts')
      .select('status')
      .eq('teacher_id', teacherId)
      .eq('month', `${month}-01`)
      .maybeSingle());
    return data?.status ?? null;
  }
}
