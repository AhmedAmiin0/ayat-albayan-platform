import type { Tables } from '@ab/db';
import type { SalesWeeklySlot } from '@ab/shared';
import { DAY, localDay, toMinutes, weekdayOf, zonedToUtc } from '@/modules/people/teachers';

// One weekly rule as sales read it («الجدول» of «تفاصيل الطالب», «كل الطلاب»'s row): never its
// link, subscription or creator (migration 187).

/** An active rule of a student: never its meeting_link, subscription or creator. */
export type WeeklyRuleRow = Pick<
  Tables<'schedule_rules'>,
  'id' | 'byday' | 'start_time_local' | 'tz' | 'duration_min' | 'package' | 'starts_on' | 'ends_on' | 'status'
> & { teacher: { display_name_ar: string; display_name_en: string | null } | null };

/** The rule columns every sales read selects (a whitelist). */
export const WEEKLY_RULE_COLUMNS =
  'id, byday, start_time_local, tz, duration_min, package, starts_on, ends_on, status, teacher:teachers(display_name_ar, display_name_en)';

const utcDay = (date: string): number => Date.parse(`${date}T00:00:00Z`);

type RuleClock = Pick<WeeklyRuleRow, 'byday' | 'start_time_local' | 'tz' | 'starts_on' | 'ends_on'>;

/**
 * The next start of each of the rule's weekdays after `now` (not before its starts_on, not after
 * its ends_on), as UTC instants by time. Read in the rule's zone, so DST moves the instant, not the
 * wall clock.
 */
export function nextStarts(rule: RuleClock, now: Date): string[] {
  const from = Math.max(localDay(now.getTime(), rule.tz), utcDay(rule.starts_on));
  const last = rule.ends_on ? utcDay(rule.ends_on) : Infinity;
  const minutes = toMinutes(rule.start_time_local);
  const seen = new Set<number>();
  const out: number[] = [];
  for (let day = from; day <= from + 7 * DAY && day <= last; day += DAY) {
    const weekday = weekdayOf(day);
    if (!rule.byday.includes(weekday) || seen.has(weekday)) continue;
    const at = zonedToUtc(day, minutes, rule.tz);
    if (at <= now.getTime()) continue;
    seen.add(weekday);
    out.push(at);
  }
  return out.sort((a, b) => a - b).map((at) => new Date(at).toISOString());
}

/** An active weekly rule still to come; a trial's one-lesson rule and a finished course are not. */
export function toWeeklySlot(rule: WeeklyRuleRow, now: Date): SalesWeeklySlot | null {
  if (rule.package === 'trial') return null;
  const next = nextStarts(rule, now);
  if (next.length === 0) return null;
  const t = rule.teacher;
  const teacher = t && { display_name_ar: t.display_name_ar, display_name_en: t.display_name_en };
  return {
    rule_id: rule.id,
    byday: [...rule.byday].sort((a, b) => a - b),
    start_time_local: rule.start_time_local.slice(0, 5),
    tz: rule.tz,
    duration_min: rule.duration_min,
    teacher,
    next,
  };
}
