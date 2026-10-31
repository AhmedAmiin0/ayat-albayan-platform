import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { readAll } from '@/common/db/read-all';
import { dbError } from '@/common/http/http';

/** The reads of StudentExpiryJob (owner 2026-10-15, docs/11 §7): pending_renewal students, payments since. */
@Injectable()
export class StudentExpiryQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Every student whose status is pending_renewal, page by page (never cut at max_rows). */
  async pendingRenewal(): Promise<string[]> {
    const rows = await readAll((from, to) =>
      this.db.from('students').select('id').eq('status', 'pending_renewal').order('id').range(from, to),
    );
    return rows.map((r) => r.id);
  }

  /** A payment (kind payment, amount > 0) of any of the student's packages recorded at or after `since`. */
  async paidSince(studentId: string, since: string): Promise<boolean> {
    const { count, error } = await this.db
      .from('payments')
      .select('id, subscription:subscriptions!inner(student_id)', { count: 'exact', head: true })
      .eq('subscription.student_id', studentId)
      .eq('kind', 'payment')
      .gt('amount', 0)
      .gte('created_at', since);
    if (error) throw dbError(error);
    return (count ?? 0) > 0;
  }
}
