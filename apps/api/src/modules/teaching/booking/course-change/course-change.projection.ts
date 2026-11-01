import { addDays, localDateOf, startOfLocalDay } from '@/modules/teaching/scheduling/occurrences/horizon';
import { ruleOccurrences } from '@/modules/teaching/scheduling/occurrences/occurrences';
import { generatedKey } from '@/modules/teaching/scheduling/rules/rule-projection';
import type { ChangeRule } from './course-change.repo';

// REMAINING's lessons that do not exist yet (review fix 2b): an old active rule stays active until the
// day before the change point, so the nightly HorizonJob still generates its occurrences up to then. Pure.

type UnmaterialisedInput = {
  /** The course's active rules. */
  rules: readonly ChangeRule[];
  /** `${rule_id}:${local_date}` of the rules' generated rows (CourseLessonQueries.held). */
  held: ReadonlySet<string>;
  now: Date;
  /** The change point's local date. */
  startsOn: string;
};

/**
 * Occurrences of each rule between max(now, its starts_on) and min(its ends_on, startsOn − 1) that have
 * no row yet (a date it already holds, in any status, is skipped like the generator skips it).
 */
export function unmaterialised({ rules, held, now, startsOn }: UnmaterialisedInput): number {
  const last = addDays(startsOn, -1);
  return rules.reduce((n, r) => {
    const endsOn = r.ends_on !== null && r.ends_on < last ? r.ends_on : last;
    const timing = { ...r, ends_on: endsOn };
    const from = new Date(Math.max(now.getTime(), startOfLocalDay(r.starts_on, r.tz).getTime()));
    const to = startOfLocalDay(addDays(endsOn, 1), r.tz);
    if (from >= to) return n;
    const missing = ruleOccurrences(timing, { from, to }).filter(
      (o) => !held.has(generatedKey(r.id, localDateOf(o.starts_at, r.tz))),
    );
    return n + missing.length;
  }, 0);
}
