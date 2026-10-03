import { MAKEUP_WINDOW_DAYS, type MakeupCandidate } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';

const DAY_MS = 86_400_000;
const LIMIT = 20;
/** A cancelled or moved makeup frees its missed lesson (lessons_makeup_of_key). */
const INACTIVE = '(cancelled_by_teacher,cancelled_by_admin,rescheduled)';
const SELECT =
  'id, starts_at, ends_at, status, teacher:teachers(id, display_name_ar), rule:schedule_rules!lessons_rule_id_fkey(package), lesson_students!inner(student_id, chargeable)';

/**
 * GET /booking/makeup-candidates (R-SCH-10): the lessons one student can still make up. Same rule
 * as makeupEligible and create_booking: a no_show or late-cancel excuse the package charged, not a
 * trial, not itself a makeup, within 60 days, with no active makeup yet. Newest first, at most 20.
 */
@Injectable()
export class MakeupCandidates {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(studentId: string): Promise<MakeupCandidate[]> {
    const since = new Date(Date.now() - MAKEUP_WINDOW_DAYS * DAY_MS).toISOString();
    const { data, error } = await this.db
      .from('lessons')
      .select(SELECT)
      .eq('lesson_students.student_id', studentId)
      .eq('lesson_students.chargeable', true)
      .in('status', ['no_show', 'excused'])
      .gte('starts_at', since)
      .is('makeup_of_id', null)
      .order('starts_at', { ascending: false })
      .limit(LIMIT * 2);
    if (error) throw dbError(error);
    const missed = data.filter((l) => l.rule?.package !== 'trial');
    const taken = await this.taken(missed.map((l) => l.id), studentId);
    return missed
      .filter((l) => !taken.has(l.id))
      .slice(0, LIMIT)
      .map((l) => ({
        lesson_id: l.id,
        starts_at: new Date(l.starts_at).toISOString(),
        status: l.status,
        duration_min: Math.round((Date.parse(l.ends_at) - Date.parse(l.starts_at)) / 60_000),
        teacher: l.teacher ?? { id: '', display_name_ar: '' },
      }));
  }

  /** Missed lessons that already have an active makeup for this student (a group's others still can). */
  private async taken(ids: string[], studentId: string): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const { data, error } = await this.db
      .from('lessons')
      .select('makeup_of_id')
      .in('makeup_of_id', ids)
      .eq('makeup_student_id', studentId)
      .not('status', 'in', INACTIVE);
    if (error) throw dbError(error);
    return new Set(data.flatMap((r) => (r.makeup_of_id ? [r.makeup_of_id] : [])));
  }
}
