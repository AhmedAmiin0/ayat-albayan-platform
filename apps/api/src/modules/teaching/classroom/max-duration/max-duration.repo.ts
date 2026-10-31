import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import type { MeetingTimes } from './max-duration.rule';

export type OverdueMeeting = MeetingTimes & { id: string };

/** A run's ceiling: the rest waits five minutes for the next one. */
export const RUN_CAP = 200;

/** What MeetingMaxDurationJob reads (service role): meetings only, never lessons. */
@Injectable()
export class MaxDurationRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Meetings neither ended nor cancelled whose start (else creation) is before `cutoff`. */
  async overdueMeetings(cutoff: Date): Promise<OverdueMeeting[]> {
    const at = cutoff.toISOString();
    const { data, error } = await this.db
      .from('meetings')
      .select('id, created_at, starts_at, ends_at, cancelled_at')
      .is('ends_at', null)
      .is('cancelled_at', null)
      .or(`starts_at.lt.${at},and(starts_at.is.null,created_at.lt.${at})`)
      .order('created_at', { ascending: true })
      .limit(RUN_CAP);
    if (error) throw dbError(error);
    return data;
  }
}
