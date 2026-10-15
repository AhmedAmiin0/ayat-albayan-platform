import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';

/** The reads of StudentExpiryJob (owner 2026-10-15, docs/11 §7): pending_renewal students, package end, payments. */
@Injectable()
export class StudentExpiryQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Every student whose status is pending_renewal. */
  async pendingRenewal(): Promise<string[]> {
    const { data, error } = await this.db.from('students').select('id').eq('status', 'pending_renewal');
    if (error) throw dbError(error);
    return (data ?? []).map((r) => r.id);
  }

  /** The renewal date (YYYY-MM-DD) of the student's newest package (trial packages aside), or null. */
  async packageEnd(studentId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('subscriptions')
      .select('renews_on')
      .eq('student_id', studentId)
      .neq('status', 'trial')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw dbError(error);
    return data?.renews_on ?? null;
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
