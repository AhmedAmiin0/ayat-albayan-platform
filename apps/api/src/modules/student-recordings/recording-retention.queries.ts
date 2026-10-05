import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';

export const STUCK_ERROR = 'stuck_recording';

/** The two sweeps over lesson_recordings (service role). */
@Injectable()
export class RecordingRetentionQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Rows still `recording` that started before `cutoff` become `failed`; returns how many. A second run finds none. */
  async failStuck(input: { cutoff: string; now: string }): Promise<number> {
    const { data, error } = await this.db
      .from('lesson_recordings')
      .update({ status: 'failed', ended_at: input.now, error: STUCK_ERROR })
      .eq('status', 'recording')
      .lt('started_at', input.cutoff)
      .select('id');
    if (error) throw dbError(error);
    return data.length;
  }

  /** Finished or failed rows that ended before `cutoff` and still have their file, oldest first. */
  async expired(input: { cutoff: string; limit: number }): Promise<{ id: string; file_path: string }[]> {
    const { data, error } = await this.db
      .from('lesson_recordings')
      .select('id, file_path')
      .in('status', ['done', 'failed'])
      .lt('ended_at', input.cutoff)
      .order('ended_at', { ascending: true })
      .limit(input.limit);
    if (error) throw dbError(error);
    return data;
  }
}
