import { feedbackEligible, lessonRatingMessage, RATING_TEMPLATE, type Attendance, type LessonStatus } from '@ab/shared';
import { queuedRow, type QueuedMessage } from '../../messaging/reminders/queued-row';

// Which lesson_rating rows to queue after lessons took place (pure; migration 195, docs/12 §7).

const HOUR = 60 * 60_000;
/** Lessons that started this long ago or less still get their rating (the job's look-back). */
export const RATING_LOOKBACK_MS = 36 * HOUR;
/** A rating still queued this long after the lesson started is failed «expired», never sent late. */
const RATING_EXPIRES_MS = 72 * HOUR;

export interface RatingGuardian {
  id: string;
  phone_e164: string;
  tz: string;
}

export interface RatingLessonStudent {
  attendance: Attendance | null;
  student: { id: string; name: string; guardian: RatingGuardian | null } | null;
}

export interface RatingLesson {
  id: string;
  starts_at: string;
  status: LessonStatus;
  lesson_students: RatingLessonStudent[];
}

/** One message per (lesson, guardian): rule 8, a sibling lesson asks the family once. */
export const ratingDedupKey = (lessonId: string, guardianId: string): string =>
  `${RATING_TEMPLATE}:${lessonId}:${guardianId}`;

/** The guardians of the students who attended (feedbackEligible), each with their children's names. */
export function ratingFamilies(lesson: RatingLesson): { guardian: RatingGuardian; names: string[] }[] {
  const byGuardian = new Map<string, { guardian: RatingGuardian; names: string[] }>();
  for (const ls of lesson.lesson_students) {
    const guardian = ls.student?.guardian;
    if (!ls.student || !guardian || !feedbackEligible(lesson.status, ls.attendance)) continue;
    const family = byGuardian.get(guardian.id) ?? { guardian, names: [] };
    family.names.push(ls.student.name);
    byGuardian.set(guardian.id, family);
  }
  return [...byGuardian.values()];
}

/** The lesson took place (completed / late), started already, and not longer ago than the look-back. */
export function ratingDue(lesson: Pick<RatingLesson, 'starts_at' | 'status'>, now: Date): boolean {
  const age = now.getTime() - Date.parse(lesson.starts_at);
  return (lesson.status === 'completed' || lesson.status === 'late') && age >= 0 && age <= RATING_LOOKBACK_MS;
}

/** lesson_rating rows for the lessons due; the dedup key makes a second pass a no-op. */
export function planRatings(input: { lessons: readonly RatingLesson[]; now: Date }): QueuedMessage[] {
  const { now } = input;
  return input.lessons.flatMap((lesson) => {
    if (!ratingDue(lesson, now)) return [];
    const startsAt = new Date(lesson.starts_at);
    return ratingFamilies(lesson).map(({ guardian, names }) =>
      queuedRow({
        phone: guardian.phone_e164,
        guardianId: guardian.id,
        lessonId: lesson.id,
        template: lessonRatingMessage({ lessonId: lesson.id, studentNames: names, startsAt, tz: guardian.tz }),
        dedupKey: ratingDedupKey(lesson.id, guardian.id),
        now,
        expiresAt: new Date(startsAt.getTime() + RATING_EXPIRES_MS),
      }),
    );
  });
}
