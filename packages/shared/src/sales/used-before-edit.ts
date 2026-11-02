import { z } from 'zod';
import { LESSONS_USED_BEFORE_MAX } from '@ab/money';
import { usedBeforeMax } from './start-date.js';

// «تعديل عدد الحلقات المستخدمة» (owner 2026-11-02: «i want the ability to change the number of
// attended sessions as assistant»): PATCH /subscriptions/:id/lessons-used-before, admins and
// assistants (subscriptions.set_start_date, sales by default). Same bound as the create
// (usedBeforeMax: one lesson left per course day, never the whole package), never more than the
// lessons the platform left free on it, and only while the package has no booked course (the course
// booked lessons_total − lessons_used_before lessons: a later change would split the course and
// the balance). Pure.

/** PATCH /subscriptions/:id/lessons-used-before. */
export const usedBeforeEditSchema = z.strictObject({
  lessonsUsedBefore: z.int().min(0).max(LESSONS_USED_BEFORE_MAX),
});
export type UsedBeforeEdit = z.output<typeof usedBeforeEditSchema>;

export type UsedBeforeEditProblem = 'already_cancelled' | 'used_before_course_booked' | 'used_before_too_many';

export interface UsedBeforeEditInput {
  /** The number asked for. */
  next: number;
  lessonsTotal: number;
  /** Lessons the platform counted on it (balance lessons_used − lessons_used_before). */
  platformUsed: number;
  cancelled: boolean;
  /** A course rule tied to the package (schedule_rules.subscription_id), any status. */
  courseBooked: boolean;
}

type MaxInput = Pick<UsedBeforeEditInput, 'lessonsTotal' | 'platformUsed'>;

/** The highest number the edit accepts: usedBeforeMax, never more than the lessons still free. */
export function usedBeforeEditMax(input: MaxInput): number {
  const free = input.lessonsTotal - Math.max(0, input.platformUsed);
  return Math.max(0, Math.min(usedBeforeMax(input.lessonsTotal), free));
}

const CHECKS: readonly [UsedBeforeEditProblem, (i: UsedBeforeEditInput) => boolean][] = [
  ['already_cancelled', (i) => i.cancelled],
  ['used_before_course_booked', (i) => i.courseBooked],
  ['used_before_too_many', (i) => i.next > usedBeforeEditMax(i)],
];

/** Why the edit is refused (409 for the first two, 400 for too_many); null = accepted. */
export function usedBeforeEditProblem(input: UsedBeforeEditInput): UsedBeforeEditProblem | null {
  return CHECKS.find(([, refused]) => refused(input))?.[0] ?? null;
}

/** The edit's answer: the package's lessons only (never a price: assistants edit any student's). */
export interface UsedBeforeEditResult {
  subscription_id: string;
  lessons_total: number;
  lessons_used_before: number;
  /** v_subscription_balance after the edit (lessons_used_before in). */
  lessons_used: number;
  remaining: number;
}
