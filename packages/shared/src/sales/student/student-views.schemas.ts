import { PACKAGE_SIZES, SUBSCRIPTION_STATUSES } from '@ab/catalog';
import { z } from 'zod';

// What a salesperson sees of any student's package and week: never a price, payment or link.

/** Size, status, dates and lessons used / left (v_subscription_balance, lessons_used_before in). */
export const salesPackageSummarySchema = z.object({
  id: z.string(),
  package: z.enum(PACKAGE_SIZES).nullable(),
  status: z.enum(SUBSCRIPTION_STATUSES),
  starts_on: z.string(),
  renews_on: z.string().nullable(),
  ended_at: z.string().nullable(),
  /** The start of the booked lesson expected to use the last one left; null when not known. */
  projected_end_at: z.string().nullable(),
  created_at: z.string(),
  lessons_total: z.int().nonnegative(),
  lessons_used: z.int().nonnegative(),
  /** Can fall below zero when more lessons were held than the package holds. */
  lessons_remaining: z.int(),
});
export type SalesPackageSummary = z.infer<typeof salesPackageSummarySchema>;

/** Both names: each app shows the one of its language. */
export const slotTeacherSchema = z.object({
  display_name_ar: z.string(),
  display_name_en: z.string().nullable(),
});

/** A roster row's weekly slot: the next start of each weekday (UTC) and the teacher. */
export const rosterSlotSchema = z.object({
  next: z.array(z.string()),
  teacher: slotTeacherSchema.nullable(),
});
export type RosterSlot = z.infer<typeof rosterSlotSchema>;

export const ROSTER_BASES = ['subscription', 'recent'] as const;
/** 'subscription': since the current package started; 'recent': the last 30 days. */
export const rosterBasisSchema = z.enum(ROSTER_BASES);
export type RosterBasis = z.infer<typeof rosterBasisSchema>;

/** Present lessons out of held ones (present + absent), as the attendance log counts. */
export const rosterAttendanceSchema = z.object({
  attended: z.int().nonnegative(),
  held: z.int().nonnegative(),
  basis: rosterBasisSchema,
});
export type RosterAttendance = z.infer<typeof rosterAttendanceSchema>;
