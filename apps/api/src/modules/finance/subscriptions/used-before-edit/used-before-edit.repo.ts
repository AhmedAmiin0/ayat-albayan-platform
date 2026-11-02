import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import type { SubRow } from '@/modules/finance/subscriptions/subscriptions.repo';
import { SELECT } from '@/modules/finance/subscriptions/list/subscriptions.list-query';

interface UsedBeforeWrite {
  id: string;
  /** The number read before the checks: the update lands only while it is still stored. */
  from: number;
  to: number;
}

/** The reads and the write of «تعديل عدد الحلقات المستخدمة» (service role; the route guards). */
@Injectable()
export class UsedBeforeEditRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** A course rule tied to the package, any status (SalesCourseRepo.subscriptionBooked's rule). */
  async courseBooked(subscriptionId: string): Promise<boolean> {
    const { count, error } = await this.db
      .from('schedule_rules')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_id', subscriptionId);
    if (error) throw dbError(error);
    return (count ?? 0) > 0;
  }

  /** null: another write changed the number (or cancelled the package) since it was read. */
  async setUsedBefore(write: UsedBeforeWrite): Promise<SubRow | null> {
    const { data, error } = await this.db
      .from('subscriptions')
      .update({ lessons_used_before: write.to })
      .eq('id', write.id)
      .eq('lessons_used_before', write.from)
      .neq('status', 'cancelled')
      .select(SELECT)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }
}
