import {
  GENDERS,
  PAYMENT_KINDS,
  PROGRAMS,
  STUDENT_STATUSES,
  SUBSCRIPTION_STATUSES,
} from '@ab/catalog';
import { z } from 'zod';
import { salesSubscriptionViewSchema } from '../views';

// The salesperson's teacher list and subscription history (docs/16): whitelists that never carry
// a price, rate, phone or note.

const programSchema = z.enum(PROGRAMS);
const subscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES);

export const salesTeacherStudentSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  program: programSchema,
  status: z.enum(STUDENT_STATUSES),
  /** The next open lesson (UTC instant, shown in Riyadh time); null when none is booked. */
  next_lesson_at: z.string().nullable(),
});
export type SalesTeacherStudent = z.infer<typeof salesTeacherStudentSchema>;

/** An active teacher with today's lessons, current students by kind and fixed meeting link. */
export const salesTeacherViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  name_en: z.string().nullable(),
  gender: z.enum(GENDERS),
  programs: z.array(programSchema),
  /** Lessons on today's Riyadh day that are not cancelled or moved away. */
  lessons_today: z.int().nonnegative(),
  /** A lesson of theirs is running now (start <= now < end, still open). */
  live_now: z.boolean(),
  active_count: z.int().nonnegative(),
  trial_count: z.int().nonnegative(),
  /** teachers.meeting_link, null when unset; render it only when http(s). */
  meeting_link: z.string().nullable(),
  /** Families get the platform link; absent in an old cache: clients use the academy default. */
  platform_classroom: z.boolean().optional(),
  /** A short-lived signed URL; null or absent shows initials. */
  avatar_url: z.string().nullable().optional(),
  students: z.array(salesTeacherStudentSchema),
});
export type SalesTeacherView = z.infer<typeof salesTeacherViewSchema>;

const statusChangeSchema = z.object({
  at: z.string(),
  from: subscriptionStatusSchema.nullable(),
  to: subscriptionStatusSchema.nullable(),
});

/** Date, kind, amount and currency; never the method, receipt or note. */
const historyPaymentSchema = z.object({
  id: z.string(),
  paid_at: z.string(),
  kind: z.enum(PAYMENT_KINDS),
  amount: z.number(),
  currency: z.string(),
});

/** One subscription of the student over time, with its lessons, status changes and payments. */
export const salesHistoryEntrySchema = salesSubscriptionViewSchema.omit({ student: true }).extend({
  renews_on: z.string().nullable(),
  ended_at: z.string().nullable(),
  created_at: z.string(),
  lessons_used: z.int().nonnegative(),
  /** Can fall below zero when more lessons were held than the package holds. */
  lessons_remaining: z.int(),
  /** Lessons used before the platform (counted in lessons_used); absent from older APIs. */
  lessons_used_before: z.int().nonnegative().optional(),
  /** From the audit trail: when the status changed (`from` null = created). */
  status_changes: z.array(statusChangeSchema),
  payments: z.array(historyPaymentSchema),
});
export type SalesHistoryEntry = z.infer<typeof salesHistoryEntrySchema>;

/** The opened subscription and all its student's subscriptions, oldest first. */
export const salesSubscriptionHistorySchema = z.object({
  subscription_id: z.string(),
  student: z.object({ id: z.string(), code: z.string(), name: z.string() }),
  subscriptions: z.array(salesHistoryEntrySchema),
});
export type SalesSubscriptionHistory = z.infer<typeof salesSubscriptionHistorySchema>;
