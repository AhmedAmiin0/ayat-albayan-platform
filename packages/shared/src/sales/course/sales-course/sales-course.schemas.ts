import { GENDERS, PACKAGE_SIZES, PROGRAMS } from '@ab/catalog';
import { id, instant, localDate } from '@ab/core';
import { lessonDuration } from '@ab/schedule';
import { z } from 'zod';
import { bookedCourseSchema } from '../booked-course.schemas';

/** Why the assistant cannot book the course herself (null = she can). */
export const COURSE_BLOCKS = [
  'subscription_required',
  'course_exists',
  'custom_count_admin',
] as const;
export const courseBlockSchema = z.enum(COURSE_BLOCKS);
export type CourseBlock = z.infer<typeof courseBlockSchema>;

export const salesCourseQuerySchema = z.object({ studentId: id() });

/** The subscription facts the course follows. */
export const courseSubscriptionSchema = z.object({
  id: id(),
  /** null = a custom lesson count. */
  package: z.enum(PACKAGE_SIZES).nullable(),
  duration: lessonDuration,
  lessons_total: z.int(),
  /** Taken before the platform: the course books the rest only; absent = 0. */
  lessons_used_before: z.int().optional(),
  starts_on: localDate,
});
export type CourseSubscription = z.infer<typeof courseSubscriptionSchema>;

/** SalesCourseView.draft: the picks saved before the payment (the wizard prefills them). */
export const courseDraftInfoSchema = z.object({ saved_at: instant });
export type CourseDraftInfo = z.infer<typeof courseDraftInfoSchema>;

/** What the wizard shows of the student (no guardian, no notes). */
const salesCourseStudentSchema = z.object({
  id: id(),
  code: z.string(),
  name: z.string(),
  tz: z.string(),
  program: z.enum(PROGRAMS),
  teacher_gender_pref: z.enum(GENDERS).nullable(),
  teacher_id: id().nullable(),
});

/** GET /sales/booking/course?studentId=: what the course wizard needs (no guardian, no money). */
export const salesCourseViewSchema = z.object({
  student: salesCourseStudentSchema,
  /** The newest unpaid or active subscription; null = subscription_required. */
  subscription: courseSubscriptionSchema.nullable(),
  /** Days a week to pick; null = unknown (no subscription, or a custom count the admin books). */
  perWeek: z.int().nullable(),
  blocked: courseBlockSchema.nullable(),
  /** The latest earlier course while the newest subscription has none. */
  previous: bookedCourseSchema.nullish(),
  /** The course whose active rules cover today, else the earliest upcoming one; null = none. */
  current: bookedCourseSchema.nullish(),
  /** Unpaid with an open payment link: booking saves a draft booked on payment. */
  hold: z.boolean().optional(),
  /** The draft saved for it (its picks also come as `previous` to prefill), else null / absent. */
  draft: courseDraftInfoSchema.nullish(),
});
export type SalesCourseView = z.infer<typeof salesCourseViewSchema>;
