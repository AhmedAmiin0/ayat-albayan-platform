import { ruleOf, timingOf } from '../../common/rules/rule-of';
import type { RulesSnapshot } from '../notification-rules/store/rules.reader';

/**
 * What one reminder tick needs from the notification rules (docs/23 §2c), resolved from ONE
 * NotificationPolicy snapshot. In legacy mode with no rows these are exactly the old settings:
 * reminder_minutes_before, reminder_24h_enabled, teacher_whatsapp_lesson_reminder; the rows without a
 * legacy key (join link, confirmation push) are on, the day-before hour is the lesson's own time and the
 * teacher's lead time is the families'.
 */
export interface ReminderRules {
  /** lesson_reminder.timing.minutes_before: the same-day reminder, the join link and the confirmation push. */
  minutesBefore: number;
  /** lesson_reminder (on unless a module-mode row switches it off). */
  sameDay: boolean;
  /** lesson_reminder_24h on (the template's approval is checked by the job). */
  dayBefore: boolean;
  /** lesson_reminder_24h.timing.send_at_local; null = the lesson's own time on the previous day. */
  dayBeforeAt: string | null;
  /** teacher_lesson_reminder on. */
  teacher: boolean;
  /** teacher_lesson_reminder.timing.minutes_before, null there = minutesBefore. */
  teacherMinutesBefore: number;
  /** lesson_join_link on. */
  joinLink: boolean;
  /** lesson_needs_confirmation on (PushService checks its channels). */
  confirmPush: boolean;
}

export function reminderRules(snap: RulesSnapshot): ReminderRules {
  const same = ruleOf(snap, 'lesson_reminder');
  const minutesBefore = timingOf(same, 'lesson_reminder')?.minutes_before ?? snap.settings.reminder_minutes_before;
  const dayBefore = ruleOf(snap, 'lesson_reminder_24h');
  const teacher = ruleOf(snap, 'teacher_lesson_reminder');
  return {
    minutesBefore,
    sameDay: same.enabled,
    dayBefore: dayBefore.enabled,
    dayBeforeAt: timingOf(dayBefore, 'lesson_reminder_24h')?.send_at_local ?? null,
    teacher: teacher.enabled,
    teacherMinutesBefore: timingOf(teacher, 'teacher_lesson_reminder')?.minutes_before ?? minutesBefore,
    joinLink: ruleOf(snap, 'lesson_join_link').enabled,
    confirmPush: ruleOf(snap, 'lesson_needs_confirmation').enabled,
  };
}

/** A day-before send_at_local can be as early as 06:00 the previous day: up to ~42 h ahead (DST included). */
export const DAY_BEFORE_AT_HOURS = 48;

/**
 * How many hours ahead one tick reads lessons: settings.reminder_lookahead_hours (≥ 25: the day-before
 * reminder at the lesson's own time is 23–25 h ahead), widened to 48 h only while the day-before
 * reminder is on with a fixed send_at_local hour.
 */
export function lookaheadHours(lookahead: number, rules: Pick<ReminderRules, 'dayBefore' | 'dayBeforeAt'>): number {
  return rules.dayBefore && rules.dayBeforeAt !== null ? Math.max(lookahead, DAY_BEFORE_AT_HOURS) : lookahead;
}
