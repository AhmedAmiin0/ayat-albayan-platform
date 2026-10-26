import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { conflict } from '../../../../common/http/errors';
import { readAll } from '../../scheduling/read-all';
import { dbError } from '../../../../common/http/http';

export type ProposalRow = { id: string; lesson_id: string; proposed_starts_at: string; status: string };
type NewProposal = {
  lesson_id: string;
  teacher_id: string;
  proposed_starts_at: string;
  note: string | null;
  created_by: string;
};
export type Decision = { status: 'approved' | 'rejected'; decided_by: string; new_lesson_id?: string };

/** lesson_proposals (migration 110, R-SCH-08). The table itself is the trail: who, when, outcome. */
@Injectable()
export class LessonProposalQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** 409 proposal_pending when the lesson already has one waiting (one pending per lesson). */
  async create(row: NewProposal): Promise<void> {
    const { error } = await this.db.from('lesson_proposals').insert(row);
    if (error?.code === '23505') throw conflict('proposal_pending');
    if (error) throw dbError(error);
  }

  async get(id: string): Promise<ProposalRow | null> {
    const { data, error } = await this.db
      .from('lesson_proposals')
      .select('id, lesson_id, proposed_starts_at, status')
      .eq('id', id)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** pending → approved / rejected, compare-and-set; false when it was decided meanwhile. */
  async decide(id: string, d: Decision): Promise<boolean> {
    const { data, error } = await this.db
      .from('lesson_proposals')
      .update({ ...d, decided_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id');
    if (error) throw dbError(error);
    return data.length > 0;
  }

  /** Lessons with a proposal waiting for an admin, oldest proposal first. */
  async pendingLessonIds(): Promise<string[]> {
    const rows = await readAll((from, to) =>
      this.db
        .from('lesson_proposals')
        .select('lesson_id')
        .eq('status', 'pending')
        .order('created_at')
        .order('id')
        .range(from, to),
    );
    return rows.map((r) => r.lesson_id);
  }
}
