import type { Tables } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';
import { readAll } from './read-all';

const RULE_SELECT =
  '*, teacher:teachers(id, meeting_link, tz), schedule_rule_students(student_id, student:students(meeting_link_override))' as const;

/** A schedule_rules row with what generation needs: teacher link and students (+ overrides). */
export type RuleWithLinks = Tables<'schedule_rules'> & {
  teacher: { id: string; meeting_link: string | null; tz: string } | null;
  schedule_rule_students: {
    student_id: string;
    student: { meeting_link_override: string | null } | null;
  }[];
};

/** Reads of schedule_rules (service role — callers enforce roles). R-SCH-02. */
@Injectable()
export class ScheduleQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async rule(id: string): Promise<RuleWithLinks | null> {
    const { data, error } = await this.db
      .from('schedule_rules')
      .select(RULE_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** Active rules that can still produce lessons on or after `today` (local dates are ≤ 1 day off). */
  activeRuleIds(today: string): Promise<{ id: string }[]> {
    return readAll((from, to) =>
      this.db
        .from('schedule_rules')
        .select('id')
        .eq('status', 'active')
        .or(`ends_on.is.null,ends_on.gte.${today}`)
        .order('id')
        .range(from, to),
    );
  }
}

/** Student ids and link overrides of a rule, in one pass. */
export function ruleStudents(rule: RuleWithLinks): { ids: string[]; overrides: (string | null)[] } {
  return {
    ids: rule.schedule_rule_students.map((s) => s.student_id),
    overrides: rule.schedule_rule_students.map((s) => s.student?.meeting_link_override ?? null),
  };
}
