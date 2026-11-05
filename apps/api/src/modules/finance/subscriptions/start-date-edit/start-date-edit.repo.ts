import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import type { SubRow } from '@/modules/finance/subscriptions/subscriptions.repo';
import { SELECT } from '@/modules/finance/subscriptions/list/subscriptions.list-query';

interface StartsOnWrite {
  id: string;
  /** The day read before the checks: the update lands only while it is still stored. */
  from: string;
  to: string;
}

/** The write of «تعديل تاريخ البدء» (service role; the route guards). starts_on only. */
@Injectable()
export class StartDateEditRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** null: another write changed the day (or cancelled the package) since it was read. */
  async setStartsOn(write: StartsOnWrite): Promise<SubRow | null> {
    const { data, error } = await this.db
      .from('subscriptions')
      .update({ starts_on: write.to })
      .eq('id', write.id)
      .eq('starts_on', write.from)
      .neq('status', 'cancelled')
      .select(SELECT)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }
}
