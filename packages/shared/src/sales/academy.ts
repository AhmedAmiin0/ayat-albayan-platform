import { z } from 'zod';
import type { Gender, PaymentKind, Program, StudentStatus, SubscriptionStatus } from '../enums/index.js';
import type { TeacherStudentCounts } from '../people/students/student-lists.js';
import type { SalesSubscriptionView } from './views.js';

// The salesperson's assistant side (owner 2026-10-11, docs/16): the academy's teachers, every student and
// a confirmed subscription's history. Whitelists: never a price, rate, phone or note. The one exception
// (owner 2026-10-12): a teacher's fixed meeting link in «المعلمون», nowhere else (docs/16 rows 3, 10).

/** A student of a teacher in «المعلمون»: who, which program and status (trial included), the next lesson. */
export interface SalesTeacherStudent {
  id: string;
  code: string;
  name: string;
  program: Program;
  status: StudentStatus;
  /** The next open lesson (UTC instant, shown in Riyadh time); null when none is booked. */
  next_lesson_at: string | null;
}

/**
 * GET /sales/teachers rows: an active teacher, today's lessons, the students they teach and their counts
 * (`active_count` / `trial_count`, «مشترك n · تجريبي n»), and their fixed meeting link.
 */
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
  /** teachers.meeting_link (owner 2026-10-12), null when unset; render it only when http(s). */
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
  /** The guardian's E.164 phone (owner 2026-10-27: sales see every chat with its phone): the row opens that chat. */
  guardian_phone: string | null;
  /** One of hers (the ownership of «الاشتراكات»): the row opens «تفاصيل الطالب». Absent in an old cache. */
  mine?: boolean;
}

/** `?page&pageSize&search`: search is a name (Arabic-normalised) or a code. */
export const salesStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
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
  /** From the audit trail: when the status changed (`from` null = created). */
  status_changes: { at: string; from: SubscriptionStatus | null; to: SubscriptionStatus | null }[];
  /** The payments linked to it: date, kind, amount and currency (owner 2026-10-11); never method, receipt or note. */
  payments: { id: string; paid_at: string; kind: PaymentKind; amount: number; currency: string }[];
}

/** GET /sales/subscriptions/:id/history: the opened subscription and all its student's subscriptions, oldest first. */
export interface SalesSubscriptionHistory {
  subscription_id: string;
  student: { id: string; code: string; name: string };
  subscriptions: SalesHistoryEntry[];
}
