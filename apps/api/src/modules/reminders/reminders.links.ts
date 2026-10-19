import { meetingModeOf, reminderDue, usesPlatform, type JoinWindowConfig } from '@ab/shared';
import { linkExpiry } from '../classroom/join-link.token';
import { isOpen, type ReminderLesson } from './reminders.plan';

// Which link the reminders carry, per lesson: its teacher's meeting_mode (migration 490, owner
// 2026-10-19), else the academy default settings.meeting_link_auto (owner 2026-10-12). Pure, decided
// when the job queues and never written back: lessons.meeting_link keeps the fixed link in both
// modes, so switching a teacher (or the academy) back to the fixed link brings it straight back.

export interface RoomContext {
  /** settings.meeting_link_auto: the academy default, for a teacher whose meeting_mode is null. */
  auto: boolean;
  /** LIVEKIT_* configured (env or the database's integration config), read every tick. */
  livekit: boolean;
  /** lesson_join_link approved on Meta: only then can the family get its own link. */
  joinOk: boolean;
  /** The web app's origin (the first of WEB_ORIGIN), the host of /classroom/<id>. */
  origin: string;
}

/** The lesson is held in our classroom: usesPlatform(its teacher's mode, the academy default). */
export const platformLesson = (lesson: Pick<ReminderLesson, 'teacher'>, ctx: RoomContext): boolean =>
  usesPlatform(meetingModeOf(lesson.teacher?.meeting_mode), ctx.auto);

/**
 * Our classroom instead of the lesson's fixed link: always for a platform lesson once LiveKit is
 * configured; for a static one only without a link, and only once the family's link can go too.
 */
export const roomFor = (lesson: Pick<ReminderLesson, 'meeting_link' | 'teacher'>, ctx: RoomContext): boolean =>
  ctx.livekit && (platformLesson(lesson, ctx) || (!lesson.meeting_link && ctx.joinOk));

/** The lesson's room for staff (login required): what the teacher's reminder links to. */
export const classroomUrl = (origin: string, lessonId: string): string => `${origin}/classroom/${lessonId}`;

/**
 * The lessons as the reminders should name their link. A room lesson gets the classroom page, a
 * host no template button knows, so the guardian's reminder is lesson_reminder_plain (the family's
 * own link follows as lesson_join_link) and the teacher's is teacher_lesson_reminder with the URL in
 * {{2}}. A platform lesson never falls back to the fixed link: without LiveKit its reminders carry none.
 */
export function sentLinks(lessons: readonly ReminderLesson[], ctx: RoomContext): ReminderLesson[] {
  return lessons.map((l) => {
    if (roomFor(l, ctx)) return { ...l, meeting_link: classroomUrl(ctx.origin, l.id) };
    return platformLesson(l, ctx) ? { ...l, meeting_link: null } : l;
  });
}

/** One family link to mint and send: a student of the lesson, to that student's guardian. */
export interface RoomCandidate {
  lessonId: string;
  studentId: string;
  /** {{1}} of lesson_join_link. */
  name: string;
  phone: string;
  guardianId: string;
  dedupKey: string;
  /** The room's close (linkExpiry): the token and its message both die then. */
  expiresAt: string;
}

export interface CandidateTiming {
  now: Date;
  /** settings.reminder_minutes_before: the link goes with the same-day reminder. */
  minutesBefore: number;
  win: JoinWindowConfig;
}

function lessonCandidates(lesson: ReminderLesson, at: CandidateTiming): RoomCandidate[] {
  const startsAt = new Date(lesson.starts_at);
  const expiresAt = linkExpiry(lesson, at.win);
  return lesson.students.flatMap((s) => {
    const g = s.guardian;
    if (!g || !reminderDue({ kind: 'same_day', startsAt, tz: g.tz, minutesBefore: at.minutesBefore, now: at.now })) return [];
    // ponytail: the key reuses the `lesson_reminder:` prefix on purpose, so edit_lesson_time (migration
    // 175's regex) expires and frees it when the time moves; renaming it means changing that regex too.
    const dedupKey = `lesson_reminder:${lesson.id}:${s.id}:room`;
    return [{ lessonId: lesson.id, studentId: s.id, name: s.name, phone: g.phone_e164, guardianId: g.id, dedupKey, expiresAt }];
  });
}

/**
 * lesson_join_link per (lesson, student with a guardian) once the same-day reminder is due, for a
 * lesson that goes out with our room, and only while the template is approved. One per student: the
 * button carries a guest token of that student's own, like «ابعت لينك الحلقة».
 */
export function joinCandidates(lessons: readonly ReminderLesson[], ctx: RoomContext, at: CandidateTiming): RoomCandidate[] {
  if (!ctx.joinOk) return [];
  return lessons.filter((l) => isOpen(l.status) && roomFor(l, ctx)).flatMap((l) => lessonCandidates(l, at));
}
