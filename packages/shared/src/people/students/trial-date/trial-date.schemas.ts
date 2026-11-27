import { GENDERS, PROGRAMS, STUDENT_STATUSES } from '@ab/catalog';
import { id, instant } from '@ab/core';
import { conflictSchema } from '@ab/schedule';
import { z } from 'zod';

/** moved: a newer date replaced it; awaiting: its time passed, nothing recorded yet. */
export const TRIAL_OUTCOMES = [
  'upcoming',
  'awaiting',
  'attended',
  'absent',
  'cancelled',
  'moved',
] as const;
export const trialOutcomeSchema = z.enum(TRIAL_OUTCOMES);
export type TrialOutcome = z.infer<typeof trialOutcomeSchema>;

export const trialDateQuerySchema = z.object({ studentId: z.uuid() });
export type TrialDateQuery = z.infer<typeof trialDateQuerySchema>;

/** One trial-history row, newest pick first; times are UTC instants. */
export const trialDateRowSchema = z.object({
  lesson_id: id(),
  starts_at: instant,
  ends_at: instant,
  teacher: z.object({ id: id(), name: z.string() }).nullable(),
  outcome: trialOutcomeSchema,
  /** Who picked it (lessons.created_by); null for imported rows. */
  picked_by: z.string().nullable(),
  /** When it was picked (lessons.created_at). */
  picked_at: instant,
  /** The older date this one replaced (lessons.rescheduled_from_id). */
  moved_from_id: id().nullable(),
});
export type TrialDateRow = z.infer<typeof trialDateRowSchema>;

export const trialHistorySchema = z.object({
  student_id: id(),
  status: z.enum(STUDENT_STATUSES),
  /** The family's (guardian's) zone, shown next to the viewer's when they differ. */
  family_tz: z.string(),
  /** A new date may be picked: the student has no running subscription (canPickTrialDate). */
  allowed: z.boolean(),
  count: z.int(),
  items: z.array(trialDateRowSchema),
  /** The trial a new date would move: open and still ahead; null = a new lesson. */
  upcoming_id: id().nullable(),
  /** What the wizard prefills; optional for older answers. */
  program: z.enum(PROGRAMS).optional(),
  teacher_gender_pref: z.enum(GENDERS).nullable().optional(),
  student_tz: z.string().optional(),
});
export type TrialHistory = z.infer<typeof trialHistorySchema>;

export const trialDateConflictsSchema = z.object({ conflicts: z.array(conflictSchema) });
export type TrialDateConflicts = z.infer<typeof trialDateConflictsSchema>;

/** The new trial lesson, and the one it moved (null = none was ahead). */
export const trialDateResultSchema = z.object({
  lesson_id: id(),
  starts_at: instant,
  ends_at: instant,
  teacher_id: id(),
  moved_from_id: id().nullable(),
});
export type TrialDateResult = z.infer<typeof trialDateResultSchema>;
