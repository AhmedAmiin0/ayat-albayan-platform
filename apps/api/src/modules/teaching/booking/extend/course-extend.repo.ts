import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { done } from '@/common/db/errors';

/** Service role; CourseExtend checks the key and ownership first. */
@Injectable()
export class CourseExtendRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * The latest set's rules end on the new last day and run again (the daily job may have ended
   * them once their old ends_on passed); a paused rule is never touched.
   */
  async extendRules(ruleIds: readonly string[], endsOn: string): Promise<void> {
    done(await this.db
      .from('schedule_rules')
      .update({ ends_on: endsOn, status: 'active' })
      .in('id', [...ruleIds])
      .neq('status', 'paused'));
  }
}
