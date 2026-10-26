import type { JoinWindow } from '../classroom/index.js';
import type { LessonStatus, PackageSize, SubscriptionStatus } from '../enums/index.js';

// The family portal (/portal, docs/31): what a guardian or student login reads. Whitelists only: no
// teacher phone or email, no note or internal reason, no price, payment or invoice, no other family.

/** How many days «الحلقات القادمة» looks ahead. */
export const PORTAL_LESSON_DAYS = 14;

export interface PortalStudent {
  id: string;
  code: string;
  name: string;
  /** The family's clock for this student (students.tz). */
  tz: string;
  /** An adult student who is their own contact (family sign-in, docs/30): «حسابي» instead of «أبنائي». */
  contact_is_self: boolean;
}

/** GET /portal/me. */
export interface PortalHome {
  kind: 'guardian' | 'student';
  students: PortalStudent[];
  /** wa.me link to the academy's chat line for «تواصل معنا للتجديد»; null while no chat number is known. */
  renew_url: string | null;
}

export interface PortalTeacher {
  display_name_ar: string;
  display_name_en: string | null;
}

/**
 * How the family enters: `classroom` = our platform room (POST …/join gives a one-lesson guest link inside
 * the window), `external` = the lesson's own meeting link, `none` = no way in is known yet.
 */
export type PortalWayIn = 'classroom' | 'external' | 'none';

export interface PortalLesson {
  id: string;
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  teacher: PortalTeacher;
  way_in: PortalWayIn;
  /** Only for `external`, and only while the window is open. */
  meeting_url: string | null;
  window: JoinWindow;
}

/** GET /portal/students/:id/lessons: the next PORTAL_LESSON_DAYS days, by start. */
export interface PortalLessons {
  lessons: PortalLesson[];
}

/** POST /portal/students/:id/lessons/:lessonId/join: the same guest link /join/<token> staff copy. */
export interface PortalJoinLink {
  url: string;
  expires_at: string;
}

export interface PortalReport {
  id: string;
  lesson_id: string;
  lesson_starts_at: string | null;
  sent_at: string;
  teacher: PortalTeacher | null;
  /** A recording the teacher or admin made visible to the student (visible_to_student), else null. */
  recording_id: string | null;
}

/** GET /portal/students/:id/reports: reports already sent to the family, newest first. */
export interface PortalReports {
  reports: PortalReport[];
}

/** POST …/reports/:id/url and …/recordings/:id/url: a short-lived signed link, opened at once. */
export interface PortalFileUrl {
  url: string;
  expires_at: string;
}

/** GET /portal/students/:id/package: the current package, no money; null without one. */
export interface PortalPackage {
  package: PackageSize | null;
  duration: number;
  lessons_total: number;
  remaining: number;
  starts_on: string;
  renews_on: string | null;
  status: SubscriptionStatus;
}

export interface PortalPackageView {
  package: PortalPackage | null;
}

/** wa.me/<digits> for an E.164 number (the academy's chat line). */
export const waMeUrl = (e164: string): string => `https://wa.me/${e164.replace(/\D/g, '')}`;
