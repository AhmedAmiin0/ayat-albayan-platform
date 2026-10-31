import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import type { UtcWindow } from '@/modules/teaching/scheduling/occurrences/occurrences';
import { readAll } from '@/common/db/read-all';
import { generatedKey, projectRules, type Projected, type ProjectedRule } from './rule-projection';

export type ProjectionQuery = {
  teacherId: string;
  studentIds: readonly string[];
  span: UtcWindow;
  /** Rules that must not count (the rule being moved or topped up). */
  excludeRuleIds: readonly string[];
};

const DAY_MS = 86_400_000;
const RULE_COLUMNS =
  'id, teacher_id, byday, start_time_local, duration_min, tz, starts_on, ends_on, schedule_rule_students(student_id)' as const;

/** Loads the active rules of a teacher and of some students, and projects them (rule-projection). */
@Injectable()
export class RuleProjectionQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async busy(q: ProjectionQuery, now = new Date()): Promise<Projected> {
    const skip = new Set(q.excludeRuleIds);
    const rules = (await this.rules(q)).filter((r) => !skip.has(r.id));
    if (rules.length === 0) return { teacher: [], students: [] };
    const generated = await this.generated(rules.map((r) => r.id), q.span);
    return projectRules({ rules, generated, span: q.span, teacherId: q.teacherId, studentIds: q.studentIds, now });
  }

  private async rules(q: ProjectionQuery): Promise<ProjectedRule[]> {
    const ids = await this.studentRuleIds(q.studentIds);
    const owner = ids.length > 0 ? `teacher_id.eq.${q.teacherId},id.in.(${ids.join(',')})` : `teacher_id.eq.${q.teacherId}`;
    const { data, error } = await this.db
      .from('schedule_rules')
      .select(RULE_COLUMNS)
      .eq('status', 'active')
      .or(owner);
    if (error) throw dbError(error);
    return data.map(({ schedule_rule_students: students, ...rule }) => ({
      ...rule,
      student_ids: students.map((s) => s.student_id),
    }));
  }

  private async studentRuleIds(studentIds: readonly string[]): Promise<string[]> {
    if (studentIds.length === 0) return [];
    const { data, error } = await this.db
      .from('schedule_rule_students')
      .select('rule_id')
      .in('student_id', [...studentIds]);
    if (error) throw dbError(error);
    return [...new Set(data.map((r) => r.rule_id))];
  }

  /**
   * Dates the rules already hold (generated rows of any status), ±2 days around the span. Keyed on
   * local_date, not starts_at: a lesson edited in place (R-SCH-11) keeps holding its original date
   * (migration 174), so that date is neither regenerated nor projected as busy.
   */
  private async generated(ruleIds: readonly string[], span: UtcWindow): Promise<Set<string>> {
    const day = (t: number): string => new Date(t).toISOString().slice(0, 10);
    const rows = await readAll((from, to) =>
      this.db
        .from('lessons')
        .select('id, rule_id, local_date')
        .in('rule_id', [...ruleIds])
        .is('rescheduled_from_id', null)
        .gte('local_date', day(span.from.getTime() - 2 * DAY_MS))
        .lte('local_date', day(span.to.getTime() + 2 * DAY_MS))
        .order('id')
        .range(from, to),
    );
    return new Set(rows.flatMap((r) => (r.rule_id && r.local_date ? [generatedKey(r.rule_id, r.local_date)] : [])));
  }
}
