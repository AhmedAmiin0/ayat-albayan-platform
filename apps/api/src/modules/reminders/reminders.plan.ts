import {
  joinNames,
  lessonReminder24hMessage,
  lessonReminderMessage,
  lessonWhenText,
  reminderDue,
  RIYADH_TZ,
  teacherReminderMessage,
  type LessonStatus,
  type OutboundTemplate,
} from '@ab/shared';
import type { PushEvent } from '../../common/push/push.service';
import { queuedRow, type QueuedMessage } from './queued-row';

// R-MSG-02 reminder planning (docs/12 §7). Pure: the job calls it every tick; the dedup keys
// (docs/12 §2.2, one per lesson + recipient + type) make a repeated tick a no-op (rule 8).

export interface ReminderGuardian {
  id: string;
  phone_e164: string;
  tz: string;
}

export interface ReminderLesson {
  id: string;
  starts_at: string;
  status: LessonStatus;
  meeting_link: string | null;
  teacher: { id: string; display_name_ar: string; phone_e164: string | null; tz: string } | null;
  students: { name: string; guardian: ReminderGuardian | null }[];
}

export interface ReminderPlanInput {
  lessons: readonly ReminderLesson[];
  /** settings.reminder_minutes_before. */
  minutesBefore: number;
  /** settings.reminder_24h_enabled AND lesson_reminder_24h approved in the registry. */
  dayBefore: boolean;
  now: Date;
}

/** Only these get reminders; a cancelled / rescheduled / past lesson never does. */
export const REMINDER_LESSON_STATUSES = ['scheduled', 'confirmed'] as const satisfies readonly LessonStatus[];

const isOpen = (status: LessonStatus) => (REMINDER_LESSON_STATUSES as readonly string[]).includes(status);

/** Each guardian of the lesson's students with their own children in it («سهيلة ومريم»). */
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
    const to = { phone: guardian.phone_e164, guardianId: guardian.id, lessonId: lesson.id, now, expiresAt: startsAt };
    if (reminderDue({ kind: 'same_day', startsAt, tz: guardian.tz, minutesBefore, now })) {
      const template = lessonReminderMessage(message);
      rows.push(queuedRow({ ...to, template, dedupKey: `lesson_reminder:${lesson.id}:${guardian.id}` }));
    }
    if (input.dayBefore && reminderDue({ kind: 'day_before', startsAt, tz: guardian.tz, minutesBefore, now })) {
      const template = lessonReminder24hMessage({ ...message, lessonId: lesson.id });
      rows.push(queuedRow({ ...to, template, dedupKey: `lesson_reminder_24h:${lesson.id}:${guardian.id}` }));
    }
  }
  return rows;
}

function teacherRow(lesson: ReminderLesson, input: ReminderPlanInput): QueuedMessage[] {
  const { teacher } = lesson;
  if (!teacher?.phone_e164) return [];
  const startsAt = new Date(lesson.starts_at);
  const due = reminderDue({ kind: 'same_day', startsAt, tz: teacher.tz, minutesBefore: input.minutesBefore, now: input.now });
  if (!due) return [];
  const template: OutboundTemplate = teacherReminderMessage({
    names: lesson.students.map((s) => s.name),
    startsAt,
    tz: teacher.tz,
    meetingLink: lesson.meeting_link,
    teacherName: teacher.display_name_ar,
  });
  const dedupKey = `teacher_lesson_reminder:${lesson.id}:${teacher.id}`;
  const to = { phone: teacher.phone_e164, lessonId: lesson.id, now: input.now, expiresAt: startsAt };
  return [queuedRow({ ...to, template, dedupKey })];
}

/**
 * Every reminder due at `now`: same-day to each guardian (wording and time in the guardian's tz)
 * and to the teacher (teacher's tz), plus the day-before one when enabled. Each expires at the
 * lesson start, so a row the sender could not send in time is never sent late.
 */
export function planReminders(input: ReminderPlanInput): QueuedMessage[] {
  return input.lessons
    .filter((l) => isOpen(l.status) && Date.parse(l.starts_at) > input.now.getTime())
    .flatMap((l) => [...guardianRows(l, input), ...teacherRow(l, input)]);
}

const DAY_MS = 24 * 60 * 60_000;

/**
 * R-MOB-01 lesson_needs_confirmation: a lesson still `scheduled` (nobody confirmed it) that
 * starts within the next 24 h. PushService's dedup key (lesson id) makes it once per lesson.
 */
export function needsConfirmation(lessons: readonly ReminderLesson[], now: Date): ReminderLesson[] {
  const t = now.getTime();
  return lessons.filter((l) => {
    const start = Date.parse(l.starts_at);
    return l.status === 'scheduled' && start > t && start - t <= DAY_MS;
  });
}

/** The push for one such lesson. One text for every admin, so the time is the academy's (Riyadh). */
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
