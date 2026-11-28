import type { LessonStatus, PackageSize } from '@ab/catalog';
import type { AdminTaskView } from './tasks/admin-task.schemas';

// GET /dashboard/work: the admin's queue behind the KPI strip (docs/07 §6).

/** The work panel's tabs, in screen order. */
export const WORK_TABS = ['reports', 'unpaid', 'tasks'] as const;
export type WorkTab = (typeof WORK_TABS)[number];

export interface WorkList<T> {
  total: number;
  /** Oldest first, at most the API's WORK_ITEMS. */
  items: T[];
}

export interface WorkStudentRef {
  id: string;
  code: string;
  name: string;
}

export interface PendingReportRow {
  lesson_id: string;
  starts_at: string;
  status: LessonStatus;
  teacher: { id: string; display_name_ar: string };
  student: WorkStudentRef;
}

export interface UnpaidRow {
  id: string;
  student: WorkStudentRef;
  package: PackageSize | null;
  lessons_total: number;
  price: number;
  /** Sum of its payments, in `currency`. */
  paid: number;
  /** price − paid, never below 0. */
  owed: number;
  /** owes: money is still due; renewal_due: paid in full and used up, a new package is due. */
  reason: 'owes' | 'renewal_due';
  currency: string;
  starts_on: string;
}

/** A task plus its package's use, so the UI can word the lessons left. */
export type TaskRow = AdminTaskView & { balance: { used: number; total: number } | null };

export interface DashboardWork {
  pending_reports: WorkList<PendingReportRow>;
  unpaid: WorkList<UnpaidRow>;
  tasks: WorkList<TaskRow>;
}
