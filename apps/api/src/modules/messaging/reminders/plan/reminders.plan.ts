import {
  joinNames,
  lessonReminder24hMessage,
  lessonReminderMessage,
  lessonWhenText,
  localDayStart,
  reminderDue,
} from '@ab/shared';
import type { LessonStatus } from '@ab/catalog';
import { RIYADH_TZ } from '@ab/time';
import type { PushEvent } from '@/common/push/push.service';
import { queuedRow, type QueuedMessage } from '@/modules/messaging/reminders/queued-row';
import { teacherReminderDue } from './teacher-due';
import type { ReminderGuardian, ReminderLesson, ReminderPlanInput } from './reminders.plan.types';
import { teacherTemplate } from './teacher-template';

// R-MSG-02 reminder planning (docs/12 §7). Pure: the job calls it every tick; the dedup keys
// (docs/12 §2.2, one per lesson + recipient + type) make a repeated tick a no-op (rule 8).

/** Only these get reminders; a cancelled / rescheduled / past lesson never does. */
export const REMINDER_LESSON_STATUSES = [
  'scheduled',
  'confirmed',
] as const satisfies readonly LessonStatus[];

export const isOpen = (status: LessonStatus): boolean =>
  (REMINDER_LESSON_STATUSES as readonly string[]).includes(status);

/** Each guardian of the lesson's students with their own children in it. */
function byGuardian(lesson: ReminderLesson): { guardian: ReminderGuardian; names: string[] }[] {
  const groups = new Map<string, { guardian: ReminderGuardian; names: string[] }>();
  for (const s of lesson.students) {
    if (!s.guardian) continue;
    const group = groups.get(s.guardian.id) ?? { guardian: s.guardian, names: [] };
    group.names.push(s.name);
    groups.set(s.guardian.id, group);
  }
  return [...groups.values()];
}

function guardianRows(lesson: ReminderLesson, input: ReminderPlanInput): QueuedMessage[] {
  const startsAt = new Date(lesson.starts_at);
  const { minutesBefore, now } = input;
  const rows: QueuedMessage[] = [];
  for (const { guardian, names } of byGuardian(lesson)) {
    const message = { names, startsAt, tz: guardian.tz, meetingLink: lesson.meeting_link };
    const to = {
      phone: guardian.phone_e164,
      guardianId: guardian.id,
      lessonId: lesson.id,
      now,
      expiresAt: startsAt,
    };
    const due = { startsAt, tz: guardian.tz, minutesBefore, now };
    if (input.sameDay !== false && reminderDue({ kind: 'same_day', ...due })) {
      const template = lessonReminderMessage(message);
      rows.push(queuedRow({ ...to, template, dedupKey: `lesson_reminder:${lesson.id}:${guardian.id}` }));
    }
    const dayBefore = { kind: 'day_before', ...due, sendAtLocal: input.dayBeforeAt } as const;
    if (input.dayBefore && reminderDue(dayBefore)) {
      const template = lessonReminder24hMessage({ ...message, lessonId: lesson.id });
      const dedupKey = `lesson_reminder_24h:${lesson.id}:${guardian.id}`;
      // "Tomorrow" is only true until the lesson's day starts for the guardian; never sent later.
      const expiresAt = localDayStart(startsAt, guardian.tz);
      rows.push(queuedRow({ ...to, template, dedupKey, expiresAt }));
    }
  }
  return rows;
}

function teacherRow(lesson: ReminderLesson, input: ReminderPlanInput): QueuedMessage[] {
  const { teacher } = lesson;
  if (!teacher?.phone_e164 || !teacherReminderDue(lesson, input)) return [];
  const startsAt = new Date(lesson.starts_at);
  const links = input.teacherLinks?.get(lesson.id);
  const v3 = input.teacherV3 === true;
  const template = teacherTemplate({ teacher, lesson, origin: input.origin, links, v3 });
  const dedupKey = `teacher_lesson_reminder:${lesson.id}:${teacher.id}`;
  const to = { phone: teacher.phone_e164, lessonId: lesson.id, now: input.now };
  return [queuedRow({ ...to, expiresAt: startsAt, template, dedupKey })];
}

/**
 * Every reminder due at `now`: same-day to each guardian (wording and time in the guardian's tz)
 * and to the teacher (teacher's tz, own lead time; unless teacher_lesson_reminder is OFF), plus
 * the day-before one when enabled. Same-day ones expire at the lesson start, the day-before one
 * at the guardian's midnight before it: a row the sender could not send in time never goes late.
 */
export function planReminders(input: ReminderPlanInput): QueuedMessage[] {
  return input.lessons
    .filter((l) => isOpen(l.status) && Date.parse(l.starts_at) > input.now.getTime())
    .flatMap((l) => [
      ...guardianRows(l, input),
      ...(input.teacherReminders === false ? [] : teacherRow(l, input)),
    ]);
}

/**
 * R-MOB-01 lesson_needs_confirmation (docs/12 §6): at the same-day reminder time
 * (lesson_reminder minutes_before) the lesson is still `scheduled` — nobody confirmed it.
 * PushService's dedup key (lesson id) makes it once per lesson.
 */
export function needsConfirmation(
  lessons: readonly ReminderLesson[],
  at: { now: Date; minutesBefore: number },
): ReminderLesson[] {
  const t = at.now.getTime();
  return lessons.filter((l) => {
    const start = Date.parse(l.starts_at);
    return l.status === 'scheduled' && start > t && start - at.minutesBefore * 60_000 <= t;
  });
}

/**
 * The push for one such lesson. One text for every admin, so the time is the academy's (Riyadh).
 */
export function confirmationPush(lesson: ReminderLesson): PushEvent {
  return {
    subject: lesson.id,
    vars: {
      names: joinNames(lesson.students.map((s) => s.name)),
      when: lessonWhenText(new Date(lesson.starts_at), RIYADH_TZ),
    },
    data: { lessonId: lesson.id },
  };
}
