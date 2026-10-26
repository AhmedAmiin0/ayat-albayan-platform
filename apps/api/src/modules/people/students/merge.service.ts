import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { dbError } from '../guardians/http';

export type MergeOptions = { keptId: string; mergedId: string; actorId: string };

/**
 * Merges student B into A (R-STU-03, R-NFR-03). The whole merge — re-pointing every reference,
 * the student_merges snapshot, the audit_log row and deleting B — runs in one Postgres function
 * (migration 20261001000020_merge_students.sql), so it is atomic.
 */
@Injectable()
export class MergeService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async merge(opts: MergeOptions): Promise<{ merge_id: string }> {
    const { data, error } = await this.db.rpc('merge_students', {
      p_kept: opts.keptId,
      p_merged: opts.mergedId,
      p_actor: opts.actorId,
    });
    if (error) throw dbError(error);
    if (!data) throw new InternalServerErrorException('merge_students returned no id');
    return { merge_id: data };
  }
}
