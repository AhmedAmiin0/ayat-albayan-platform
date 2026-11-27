import { z } from 'zod';
import { pageQuery } from '@ab/core';
import type { Gender, PaymentKind, Program, StudentStatus, SubscriptionStatus } from '@ab/catalog';
import type { TeacherStudentCounts } from '../people/students/student-lists';
import type { SalesPackageSummary } from './student/student-package';
import type { RosterAttendance, RosterSlot } from './student/student-roster';
import type { SalesSubscriptionView } from './portal';

// Sales assistant view (docs/16) never carries price, rate, phone or note, except the meet link.

export interface SalesTeacherStudent {
  id: string;
  code: string;
  name: string;
  program: Program;
  status: StudentStatus;
  /** The next open lesson (UTC instant, shown in Riyadh time); null when none is booked. */
  next_lesson_at: string | null;
}

/** An active teacher with today's lessons, students, counts and fixed meeting link. */
export interface SalesTeacherView extends TeacherStudentCounts {
  id: string;
  name: string;
  name_en: string | null;
  gender: Gender;
  programs: Program[];
  /** Lessons on today's Riyadh day that are not cancelled or moved away. */
  lessons_today: number;
  /** A lesson of theirs is running now (start <= now < end, still open). */
  live_now: boolean;
  /** teachers.meeting_link, null when unset; render it only when http(s). */
  meeting_link: string | null;
  /**
   * usesPlatform(teachers.meeting_mode, settings.meeting_link_auto): families get the platform link.
   * Absent in a payload cached before migration 490: clients use the academy default.
   */
  platform_classroom?: boolean;
  /** The teacher's photo, a short-lived signed URL; null/absent = initials. */
  avatar_url?: string | null;
  students: SalesTeacherStudent[];
}

/** GET /sales/students/all rows: who, which teacher and program; no balance, package or note. */
export interface SalesStudentView {
  id: string;
  code: string;
  name: string;
  status: StudentStatus;
  program: Program;
  teacher_name: string | null;
  guardian_name: string;
  /** The guardian's E.164 phone (sales see every chat with its phone): the row opens that chat. */
  guardian_phone: string | null;
  /** One of hers by subscription ownership; opens student details; absent in an old cache. */
  mine?: boolean;
  /** The active weekly slots, read in the viewer's zone. Absent: old cache. */
  weekly?: RosterSlot[];
  /** Present / held in the current package, else the last 30 days. Absent: old cache. */
  attendance?: RosterAttendance;
  /** The current package, hers or not, no price. null: none; absent: old. */
  package?: SalesPackageSummary | null;
}

/** `?page&pageSize&search`: search is a name (Arabic-normalised) or a code. */
export const salesStudentsQuerySchema = z.object({
  ...pageQuery({ size: 25 }),
  search: z.string().trim().max(100).optional(),
});
export type SalesStudentsQuery = z.output<typeof salesStudentsQuerySchema>;

/** One subscription of the student over time, with its lessons, dated events and its payments' amounts; no price. */
export interface SalesHistoryEntry extends Omit<SalesSubscriptionView, 'student'> {
  renews_on: string | null;
  ended_at: string | null;
  created_at: string;
  lessons_used: number;
  lessons_remaining: number;
  /** Lessons used before the platform (in lessons_used); absent from older APIs. */
  lessons_used_before?: number;
  /** From the audit trail: when the status changed (`from` null = created). */
  status_changes: { at: string; from: SubscriptionStatus | null; to: SubscriptionStatus | null }[];
  /** The payments linked to it: date, kind, amount and currency; never method, receipt or note. */
  payments: { id: string; paid_at: string; kind: PaymentKind; amount: number; currency: string }[];
}

/** GET /sales/subscriptions/:id/history: the opened subscription and all its student's subscriptions, oldest first. */
export interface SalesSubscriptionHistory {
  subscription_id: string;
  student: { id: string; code: string; name: string };
  subscriptions: SalesHistoryEntry[];
}
