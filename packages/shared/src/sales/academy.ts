import { z } from 'zod';
import type { Gender, PaymentKind, Program, StudentStatus, SubscriptionStatus } from '../enums/index.js';
import type { SalesSubscriptionView } from './views.js';

// The salesperson's assistant side (owner 2026-10-11, docs/16): the academy's teachers, every student and
// a confirmed subscription's history. Whitelists: never a price, rate, phone, note or meeting link.

/** GET /sales/teachers rows: an active teacher and the students they teach. */
export interface SalesTeacherView {
  id: string;
  name: string;
  name_en: string | null;
  gender: Gender;
  programs: Program[];
  students: { id: string; code: string; name: string }[];
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
}

/** `?page&pageSize&search`: search is a name (Arabic-normalised) or a code. */
export const salesStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).optional(),
});
export type SalesStudentsQuery = z.output<typeof salesStudentsQuerySchema>;

/** One subscription of the student over time, with its lessons and dated events; no money. */
export interface SalesHistoryEntry extends Omit<SalesSubscriptionView, 'student'> {
  renews_on: string | null;
  ended_at: string | null;
  created_at: string;
  lessons_used: number;
  lessons_remaining: number;
  /** From the audit trail: when the status changed (`from` null = created). */
  status_changes: { at: string; from: SubscriptionStatus | null; to: SubscriptionStatus | null }[];
  /** The payments linked to it: date and kind only (the sales lists show no amount). */
  payments: { id: string; paid_at: string; kind: PaymentKind }[];
}

/** GET /sales/subscriptions/:id/history: the opened subscription and all its student's subscriptions, oldest first. */
export interface SalesSubscriptionHistory {
  subscription_id: string;
  student: { id: string; code: string; name: string };
  subscriptions: SalesHistoryEntry[];
}
