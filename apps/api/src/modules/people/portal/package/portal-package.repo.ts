import type { PackageSize, SubscriptionStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

/** A package without price, currency, fx, quote or notes. */
interface PortalPackageRow {
  id: string;
  package: PackageSize | null;
  duration: number;
  lessons_total: number;
  starts_on: string;
  renews_on: string | null;
  status: SubscriptionStatus;
}

/** «الباقة» reads (service role). The balance comes from BalanceQueries (v_subscription_balance). */
@Injectable()
export class PortalPackageRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The student's packages in FIFO order (as SubscriptionsQueries.forStudent): the last is the current one; never a cancelled one. */
  async packages(studentId: string): Promise<PortalPackageRow[]> {
    const { data, error } = await this.db
      .from('subscriptions')
      .select('id, package, duration, lessons_total, starts_on, renews_on, status')
      .eq('student_id', studentId)
      .neq('status', 'cancelled')
      .order('starts_on')
      .order('created_at')
      .order('id');
    if (error) throw dbError(error);
    return data;
  }
}
