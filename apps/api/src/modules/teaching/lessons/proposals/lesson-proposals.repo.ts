import type { ProposalRequester } from '@ab/schedule';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { conflict } from '@/common/http/errors';
import { readAll } from '@/common/db/read-all';
import { dbError } from '@/common/http/http';

/** `note`: the asker's reason, the move reason on approval (docs/47). `created_by`: who asked. */
export interface ProposalRow {
  id: string;
  lesson_id: string;
  proposed_starts_at: string;
  status: string;
  note: string | null;
  requested_by: string;
  created_by: string | null;
}
type NewProposal = {
  lesson_id: string;
  teacher_id: string;
  proposed_starts_at: string;
  note: string | null;
  created_by: string;
  /** Absent: the teacher's (the column default). */
  requested_by?: ProposalRequester;
};
type Decision = {
  status: 'approved' | 'rejected';
  decided_by: string;
  /** The answer's note, shown to the family. */
  decision_note?: string | null;
};

const COLUMNS = 'id, lesson_id, proposed_starts_at, status, note, requested_by, created_by';

/**
 * lesson_proposals (migration 110, R-SCH-08). The table itself is the trail: who, when, outcome.
 */
@Injectable()
export class LessonProposalRepo {
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
      .select(COLUMNS)
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

  /**
   * approve()'s claim lost to a failed move: approved → pending again (by the same decider). A new
   * request the family sent meanwhile holds the one pending slot: then this one stays approved.
   */
  async release(id: string): Promise<void> {
    const { error } = await this.db
      .from('lesson_proposals')
      .update({ status: 'pending', decided_by: null, decided_at: null })
      .eq('id', id)
      .eq('status', 'approved');
    if (error && error.code !== '23505') throw dbError(error);
  }

  /** The approved proposal's moved lesson. */
  async link(id: string, newLessonId: string): Promise<void> {
    const { error } = await this.db
      .from('lesson_proposals')
      .update({ new_lesson_id: newLessonId })
      .eq('id', id);
    if (error) throw dbError(error);
  }

  /** The asker's own pending request becomes withdrawn; false when there is none. */
  async withdraw(input: { lessonId: string; userId: string }): Promise<boolean> {
    const { data, error } = await this.db
      .from('lesson_proposals')
      .update({ status: 'withdrawn', decided_at: new Date().toISOString() })
      .match({ lesson_id: input.lessonId, created_by: input.userId })
      .eq('requested_by', 'family')
      .eq('status', 'pending')
      .select('id');
    if (error) throw dbError(error);
    return data.length > 0;
  }

  /** Lessons with a proposal waiting for an answer, oldest first; `by` keeps one requester's. */
  async pendingLessonIds(by?: ProposalRequester): Promise<string[]> {
    const rows = await readAll((from, to) => {
      const q = this.db.from('lesson_proposals').select('lesson_id').eq('status', 'pending');
      return (by ? q.eq('requested_by', by) : q).order('created_at').order('id').range(from, to);
    });
    return rows.map((r) => r.lesson_id);
  }
}
