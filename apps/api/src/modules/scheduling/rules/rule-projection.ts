import type { BusyLesson, StudentBusyLesson } from '../conflicts/conflicts';
import { localDateOf } from '../occurrences/horizon';
import { ruleOccurrences, type RuleTiming, type UtcWindow } from '../occurrences/occurrences';

/** An active rule with its students (what projection needs from schedule_rules). */
export type ProjectedRule = RuleTiming & {
  id: string;
  teacher_id: string;
  student_ids: readonly string[];
};

export type ProjectionInput = {
  rules: readonly ProjectedRule[];
  /** `${rule_id}:${local_date}` of every generated row of those rules (any status). */
  generated: ReadonlySet<string>;
  span: UtcWindow;
  teacherId: string;
  studentIds: readonly string[];
  /** Occurrences before this are history, not busy (a rule booked mid-day skips its past slot). */
  now: Date;
};
export type Projected = { teacher: BusyLesson[]; students: StudentBusyLesson[] };

/** Longest lesson: an occurrence that starts this long before the span can still overlap it. */
const LOOKBACK_MS = 3 * 60 * 60_000;

export const generatedKey = (ruleId: string, localDate: string): string => `${ruleId}:${localDate}`;

/**
 * Occurrences a rule will produce but the daily job hasn't generated yet (beyond the horizon, or
 * the rest of a rule booked today) count as busy too (R-SCH-04, issue B3): a DST change or a moved
 * lesson can land on them. A date the rule already holds (lesson, cancelled or moved) is skipped,
 * exactly like the generator skips it. `id` is the rule's id: there is no lesson row yet.
 */
export function projectRules(input: ProjectionInput): Projected {
  const wanted = new Set(input.studentIds);
  const window = {
    from: new Date(Math.max(input.span.from.getTime() - LOOKBACK_MS, input.now.getTime())),
    to: input.span.to,
  };
  const out: Projected = { teacher: [], students: [] };
  for (const rule of input.rules) {
    for (const o of ruleOccurrences(rule, window)) {
      if (input.generated.has(generatedKey(rule.id, localDateOf(o.starts_at, rule.tz)))) continue;
      const busy: BusyLesson = { id: rule.id, ...o };
      if (rule.teacher_id === input.teacherId) out.teacher.push(busy);
      for (const s of rule.student_ids) {
        if (wanted.has(s)) out.students.push({ ...busy, student_id: s });
      }
    }
  }
  return out;
}
