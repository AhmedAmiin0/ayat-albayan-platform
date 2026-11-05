import { reminderDue } from '@ab/shared';
import type { ReminderLesson } from './reminders.plan';
import { staffReachable } from './staff-reachable';

/** What decides when the teacher's same-day reminder is due. */
export interface TeacherTiming {
  /** The lesson_reminder rule's minutes_before (the teacher's default lead time). */
  minutesBefore: number;
  teacherMinutesBefore?: number;
  now: Date;
}

/**
 * The teacher's same-day reminder is due now (teacher's tz, own lead time) and they can get it:
 * a phone and reachable on WhatsApp. Shared by the plan and the job (which makes the links first).
 */
export function teacherReminderDue(lesson: ReminderLesson, at: TeacherTiming): boolean {
  const { teacher } = lesson;
  if (!teacher?.phone_e164 || !staffReachable(teacher)) return false;
  const minutesBefore = at.teacherMinutesBefore ?? at.minutesBefore;
  return reminderDue({
    kind: 'same_day',
    startsAt: new Date(lesson.starts_at),
    tz: teacher.tz,
    minutesBefore,
    now: at.now,
  });
}
