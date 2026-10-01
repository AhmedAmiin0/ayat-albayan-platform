import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../guardians/http';

type MergeArgs = { p_kept: string; p_merged: string; p_actor: string | null };
type MergeRpc = (
  fn: 'merge_students',
  args: MergeArgs,
) => PromiseLike<{ data: string | null; error: { code?: string; message: string } | null }>;

export type MergeOptions = { keptId: string; mergedId: string; actorId: string | null };

/**
 * Merges student B into A (R-STU-03, R-NFR-03). The whole merge — re-pointing every reference,
 * the student_merges snapshot, the audit_log row and deleting B — runs in one Postgres function
 * (migration 20261001000020_merge_students.sql), so it is atomic.
 */
@Injectable()
export class MergeService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async merge(opts: MergeOptions): Promise<{ merge_id: string }> {
    // TODO(integrator): drop the cast once `pnpm --filter @ab/db gen:types` knows merge_students.
    const rpc = this.db.rpc.bind(this.db) as unknown as MergeRpc;
    const { data, error } = await rpc('merge_students', {
      p_kept: opts.keptId,
      p_merged: opts.mergedId,
      p_actor: opts.actorId,
    });
    if (error) throw dbError(error);
    if (!data) throw new InternalServerErrorException('merge_students returned no id');
    return { merge_id: data };
  }
}
