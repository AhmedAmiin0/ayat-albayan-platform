import { z } from 'zod';
import { LESSONS_USED_BEFORE_MAX } from '@ab/money';
import { usedBeforeMax } from '../start-date.js';

// «تعديل عدد الحلقات المستخدمة» (owner 2026-11-02: «i want the ability to change the number of
// attended sessions as assistant»): PATCH /subscriptions/:id/lessons-used-before, admins and
// assistants holding subscriptions.edit_terms (admin only by default). Same bound as the create
// (usedBeforeMax: every lesson but one, never the whole package), never more than the
// lessons the platform left free on it, and only while the package has no booked course (the course
// booked lessons_total − lessons_used_before lessons: a later change would split the course and
// the balance). Pure.

/** PATCH /subscriptions/:id/lessons-used-before. */
export const usedBeforeEditSchema = z.strictObject({
  lessonsUsedBefore: z.int().min(0).max(LESSONS_USED_BEFORE_MAX),
});
export type UsedBeforeEdit = z.output<typeof usedBeforeEditSchema>;

export type UsedBeforeEditProblem =
  | 'already_cancelled'
  | 'used_before_course_booked'
  | 'used_before_needs_past_start'
  | 'used_before_too_many';

export interface UsedBeforeEditInput {
  /** The number asked for. */
  next: number;
  lessonsTotal: number;
  /** Lessons the platform counted on it (balance lessons_used − lessons_used_before). */
  platformUsed: number;
  cancelled: boolean;
  /** An assistant course rule tied to the package (schedule_rules.subscription_id), any status. */
  courseBooked: boolean;
  /**
   * starts_on before the academy's today: the create's rule (usedBeforeProblem). A count > 0 makes
   * a package «already started» (no commission, migration 942); with a past start it already is,
   * so the edit never changes who earns a commission.
   */
  pastStart: boolean;
}

type MaxInput = Pick<UsedBeforeEditInput, 'lessonsTotal' | 'platformUsed' | 'pastStart'>;

/** The highest number the edit accepts: usedBeforeMax, never past the free lessons; 0 unstarted. */
export function usedBeforeEditMax(input: MaxInput): number {
  const free = input.lessonsTotal - Math.max(0, input.platformUsed);
  const max = Math.max(0, Math.min(usedBeforeMax(input.lessonsTotal), free));
  return input.pastStart ? max : 0;
}

interface OfferInput {
  cancelled: boolean;
  pastStart: boolean;
  current: number;
}

/** Whether a card offers the edit: not cancelled, and a past start or a count to lower. */
export function usedBeforeEditOffered(pkg: OfferInput): boolean {
  return !pkg.cancelled && (pkg.pastStart || pkg.current > 0);
}

const CHECKS: readonly [UsedBeforeEditProblem, (i: UsedBeforeEditInput) => boolean][] = [
  ['already_cancelled', (i) => i.cancelled],
  ['used_before_course_booked', (i) => i.courseBooked],
  ['used_before_needs_past_start', (i) => i.next > 0 && !i.pastStart],
  ['used_before_too_many', (i) => i.next > usedBeforeEditMax(i)],
];

/** Why the edit is refused (409 for the first two, else 400); null = accepted. */
export function usedBeforeEditProblem(input: UsedBeforeEditInput): UsedBeforeEditProblem | null {
  return CHECKS.find(([, refused]) => refused(input))?.[0] ?? null;
}

/**
 * The edit's answer: the package's lessons only (never a price: assistants edit any student's);
 * lessons_used / remaining are v_subscription_balance after the edit (lessons_used_before in).
 */
export const usedBeforeEditResultSchema = z.object({
  subscription_id: z.string(),
  lessons_total: z.int(),
  lessons_used_before: z.int(),
  lessons_used: z.int(),
  remaining: z.int(),
});
export type UsedBeforeEditResult = z.infer<typeof usedBeforeEditResultSchema>;
