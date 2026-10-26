import type { PayoutStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { dbError } from '../../../../common/http/http';

/** The one read «عدّل الوقت» needs beyond the lesson itself (service role; the controller guards). */
@Injectable()
export class TimeEditQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The teacher's payout status for `YYYY-MM`, null when that month has no payout row yet. */
  async payoutStatus(teacherId: string, month: string): Promise<PayoutStatus | null> {
    const { data, error } = await this.db
      .from('teacher_payouts')
      .select('status')
      .eq('teacher_id', teacherId)
      .eq('month', `${month}-01`)
      .maybeSingle();
    if (error) throw dbError(error);
    return data?.status ?? null;
  }
}
