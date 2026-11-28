import { z } from 'zod';
import { LESSON_STATUSES, SUBSCRIPTION_STATUSES } from '@ab/catalog';

// Course and package card; extend books lessons left after the planned end; pure schemas (rule 12).

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** One upcoming lesson of the course (its instant; the app formats it in the viewer's zone). */
export const courseCardLessonSchema = z.object({
  id: z.string(),
  startsAt: z.string(),
  status: z.enum(LESSON_STATUSES),
});
export type CourseCardLesson = z.infer<typeof courseCardLessonSchema>;

export const courseCardPackageSchema = z.object({
  status: z.enum(SUBSCRIPTION_STATUSES),
  lessonsTotal: z.number().int(),
  /** This package's lessons used (FIFO) and left (never below 0). */
  used: z.number().int(),
  left: z.number().int(),
  paid: z.number(),
  /** What the package is owed for (owedFor: a stopped course's stored decision). */
  owed: z.number(),
  currency: z.string(),
  /** The projected end instant; null when not known. */
  projectedEndAt: z.string().nullable(),
});
export type CourseCardPackage = z.infer<typeof courseCardPackageSchema>;

/**
 * GET /students/:id/course-card (admin) and /sales/students/:id/course-card (assistant): the
 * current package's course. `course` null = no course booked (a package not booked yet).
 */
export const courseCardSchema = z.object({
  subscriptionId: z.string().nullable(),
  /** The package's numbers; null without one (absent from an older API). */
  package: courseCardPackageSchema.nullable().default(null),
  course: z
    .object({
      teacherName: z.string().nullable(),
      /** Each weekday (0 = Sunday) with its "HH:MM" in the course zone. */
      days: z.array(z.object({ weekday: z.number().int(), startTimeLocal: z.string() })),
      tz: z.string(),
      /** The course's planned last local day (its rules' ends_on). */
      endsOn: localDate,
      /** The last booked lesson of the course (its instant); null = none. */
      lastAt: z.string().nullable(),
      lessonsTotal: z.number().int(),
      /** Lessons of the package with no date yet; extending the schedule books them. */
      unbooked: z.number().int(),
    })
    .nullable(),
  /** The next open lessons, earliest first (at most COURSE_CARD_UPCOMING). */
  upcoming: z.array(courseCardLessonSchema),
});
export type CourseCardView = z.infer<typeof courseCardSchema>;

/** How many upcoming lessons the card lists. */
export const COURSE_CARD_UPCOMING = 8;

/** GET …/course-extend?subscriptionId= (absent = the current package). */
export const courseExtendQuerySchema = z.object({ subscriptionId: z.uuid().optional() });

/** POST …/course-extend: idempotent by itself (once booked, nothing is left to book). */
export const courseExtendSchema = z.strictObject({ subscriptionId: z.uuid() });
export type CourseExtendRequest = z.infer<typeof courseExtendSchema>;

/** The lessons extending books, on the course's own days and times. */
export const courseExtendPreviewSchema = z.object({
  subscriptionId: z.string(),
  /** The instants of the lessons it books, earliest first (empty = nothing to book). */
  starts: z.array(z.string()),
  /** The course zone (the dates are said in it). */
  tz: z.string(),
  /** The new last local day; null when nothing is booked. */
  endsOn: localDate.nullable(),
  /** Who hears it: the family and the teacher get a WhatsApp each (the booking's notices). */
  notified: z.array(z.enum(['family', 'teacher'])),
});
export type CourseExtendPreview = z.infer<typeof courseExtendPreviewSchema>;

/** POST …/course-extend's answer: how many lessons were booked and the course's new last day. */
export const courseExtendResultSchema = z.object({
  subscriptionId: z.string(),
  inserted: z.number().int(),
  endsOn: localDate.nullable(),
  conflicts: z.number().int(),
});
export type CourseExtendResult = z.infer<typeof courseExtendResultSchema>;
