import { z } from 'zod';
import type { ScheduleChange } from '@/common/events/lesson-events';

// Who hears a course change (owner 2026-10-30: «on any reschedule notify both the teacher and the
// family»): «تغيير موعد الحلقات» and «تغيير المعلم» from the profile, and the drawer's «تغيير أيام
// الحلقات». Pure: CourseChangeNotices asks FamilyMoveNotice and announces what this plans.

/** A lesson the change moved or added: its id and start. */
interface Timed {
  id: string;
  starts_at: string;
}

/** What a course change tells, read before its write (CourseChange). */
export interface CourseTold {
  /** The open lessons it moves (they become rescheduled). */
  moved: readonly Timed[];
  /** The new rules' lessons. */
  added: readonly Timed[];
  actorId: string;
  /** The course's student(s): the new teacher's teacher_new_student names them. */
  studentIds: readonly string[];
  /** «تغيير المعلم»: the rest of the course goes to another teacher. */
  teacherChanged: boolean;
}

const ADDED = z.object({
  new_rules: z.array(
    z.object({ lessons: z.array(z.object({ id: z.string(), starts_at: z.string() })) }),
  ),
});

/** change_course's new lessons (changePayload's new_rules[].lessons); none when absent. */
export function addedLessons(payload: unknown): Timed[] {
  const parsed = ADDED.safeParse(payload);
  return parsed.success ? parsed.data.new_rules.flatMap((r) => r.lessons) : [];
}

const at = (l: Timed): number => Date.parse(l.starts_at);
export const earliest = (lessons: readonly Timed[]): Timed[] =>
  [...lessons].sort((a, b) => at(a) - at(b));

/**
 * The move the family hears: the first moved lesson whose start the new days do not keep → the
 * first new lesson the old days did not hold (Sun + Tue → Sun + Wed: Tue → Wed, never «Sun → Sun»).
 * Null when no start changed (a new teacher on the same days and times).
 */
export function courseMove(told: Pick<CourseTold, 'moved' | 'added'>) {
  const olds = new Set(told.moved.map(at));
  const news = new Set(told.added.map(at));
  const from = earliest(told.moved).find((l) => !news.has(at(l)));
  const to = earliest(told.added).find((l) => !olds.has(at(l)));
  return from && to ? { from, to } : null;
}

/**
 * The ScheduleChanges announced after the commit. The same teacher: ONE lesson_rescheduled, to
 * the teacher and the family. A new teacher: the family's lesson_rescheduled alone (when a start
 * changed; its template names no teacher) and the old teacher's lesson_cancelled for the first
 * lesson they no longer hold; the new teacher hears it by teacher_new_student (TeacherAlert).
 * familyNotice: FamilyMoveNotice's choice (the booking confirmation was dropped).
 */
export function courseChanges(told: CourseTold, familyNotice: boolean): ScheduleChange[] {
  const { actorId } = told;
  const move = courseMove(told);
  const moved: ScheduleChange[] = [];
  if (move) {
    moved.push({
      kind: 'lesson_rescheduled',
      lessonId: move.to.id,
      fromStartsAt: move.from.starts_at,
      actorId,
      familyNotice,
    });
  }
  if (!told.teacherChanged) return moved;
  const family = moved.map((c) => ({ ...c, audience: 'family' as const }));
  const [lost] = earliest(told.moved);
  if (!lost) return family;
  return [...family, { kind: 'lesson_cancelled', lessonId: lost.id, actorId, audience: 'teacher' }];
}
