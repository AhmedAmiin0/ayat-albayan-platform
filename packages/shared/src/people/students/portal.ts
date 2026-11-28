import { LESSON_STATUSES } from '@ab/catalog';
import { LOCALES } from '@ab/core';
import { lessonRoomStateSchema } from '@ab/schedule';
import { z } from 'zod';
import { portalLessonFamilySchema } from './family/portal-actions';

// The family portal (/portal, docs/31, docs/50): what a guardian or student login reads. Whitelists
// only: no teacher phone or email, no note or internal reason, no other family. Money only on the
// package of a guardian or an adult student (portal-package.ts). Parsed at the client boundary.

/** How many days the upcoming lessons list looks ahead. */
export const PORTAL_LESSON_DAYS = 14;

export const portalStudentSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  /** The family's clock for this student (students.tz). */
  tz: z.string(),
  /** An adult student who is their own contact (docs/30). */
  contact_is_self: z.boolean(),
  /** students.is_test (docs/56): absent from an older API, which counts as a real student. */
  is_test: z.boolean().optional(),
});
export type PortalStudent = z.infer<typeof portalStudentSchema>;

/** GET /portal/me. */
export const portalHomeSchema = z.object({
  kind: z.enum(['guardian', 'student']),
  students: z.array(portalStudentSchema),
  /**
   * Kept for old app builds only (docs/50 §2: no WhatsApp link in family pages); no page reads it.
   */
  renew_url: z.string().nullable(),
  /** The login's own language (profiles.locale): the app switches to it. null: never chosen. */
  locale: z.enum(LOCALES).nullable().optional(),
  /** A guardian login's own name and WhatsApp (E.164); null for a student login. */
  guardian: z.object({ name: z.string(), phone: z.string() }).nullable().optional(),
});
export type PortalHome = z.infer<typeof portalHomeSchema>;
export type PortalKind = PortalHome['kind'];
export type PortalGuardian = NonNullable<PortalHome['guardian']>;

export const portalTeacherSchema = z.object({
  display_name_ar: z.string(),
  display_name_en: z.string().nullable(),
});
export type PortalTeacher = z.infer<typeof portalTeacherSchema>;

/**
 * How the family enters: `classroom` = our platform room (POST …/join admits the student as a guest
 * inside the window), `external` = the lesson's own meeting link, `none` = no way in known (or not
 * open).
 */
export const PORTAL_WAYS_IN = ['classroom', 'external', 'none'] as const;
export type PortalWayIn = (typeof PORTAL_WAYS_IN)[number];

/** @ab/schedule's JoinWindow as it crosses the wire. */
export const joinWindowSchema = z.object({
  state: z.enum(['early', 'open', 'closed']),
  opens_at: z.string(),
  closes_at: z.string(),
});

export const portalLessonSchema = z.object({
  id: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  status: z.enum(LESSON_STATUSES),
  teacher: portalTeacherSchema,
  way_in: z.enum(PORTAL_WAYS_IN),
  /** Only for `external`, and only while the window is open. */
  meeting_url: z.string().nullable(),
  window: joinWindowSchema,
  /** Absent from an older API. */
  family: portalLessonFamilySchema.optional(),
  /** Who is in the room now, or ended; absent from an older API. */
  room: lessonRoomStateSchema.nullable().optional(),
});
export type PortalLesson = z.infer<typeof portalLessonSchema>;

/** docs/50 §2: the newest sent report's homework and plan, never a draft; null without one. */
export const portalPrepareSchema = z.object({
  homework: z.string().nullable(),
  next_plan: z.string().nullable(),
  report_id: z.string(),
  lesson_starts_at: z.string().nullable(),
});
export type PortalPrepare = z.infer<typeof portalPrepareSchema>;

/** This calendar month (the student's clock): lessons attended and missed. */
export const portalMonthSchema = z.object({ attended: z.number(), absent: z.number() });
export type PortalMonth = z.infer<typeof portalMonthSchema>;

/** The next PORTAL_LESSON_DAYS days by start; counts are optional for an older API. */
export const portalLessonsSchema = z.object({
  lessons: z.array(portalLessonSchema),
  prepare: portalPrepareSchema.nullable().optional(),
  month: portalMonthSchema.optional(),
});
export type PortalLessons = z.infer<typeof portalLessonsSchema>;

export const portalReportSchema = z.object({
  id: z.string(),
  lesson_id: z.string(),
  lesson_starts_at: z.string().nullable(),
  sent_at: z.string(),
  teacher: portalTeacherSchema.nullable(),
  /** A recording staff made visible to the student (visible_to_student), else null. */
  recording_id: z.string().nullable(),
});
export type PortalReport = z.infer<typeof portalReportSchema>;

/** GET /portal/students/:id/reports: reports already sent to the family, newest first. */
export const portalReportsSchema = z.object({ reports: z.array(portalReportSchema) });
export type PortalReports = z.infer<typeof portalReportsSchema>;

/** POST …/reports/:id/url (5 minutes) and …/recordings/:id/url (an hour): a signed link. */
export const portalFileUrlSchema = z.object({ url: z.string(), expires_at: z.string() });
export type PortalFileUrl = z.infer<typeof portalFileUrlSchema>;

/**
 * POST …/lessons/:lessonId/room-link (docs/50 §2, §7): the family app opens our classroom in the
 * phone's browser through this signed /join link, no second sign-in; it dies when the room closes.
 */
export const portalRoomLinkSchema = z.object({ url: z.string(), expires_at: z.string() });
export type PortalRoomLink = z.infer<typeof portalRoomLinkSchema>;
