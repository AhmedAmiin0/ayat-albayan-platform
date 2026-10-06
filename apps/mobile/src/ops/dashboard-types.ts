import type { AdminTaskView, DashboardSummary, LessonStatus, PackageSize } from '@ab/shared';

// Mirrors apps/api/src/modules/dashboard/dashboard.types.ts (and the web's features/dashboard/types).

export type WorkTab = 'reports' | 'unpaid' | 'tasks';

export interface WorkList<T> {
  total: number;
  items: T[];
}

export interface StudentRef {
  id: string;
  code: string;
  name: string;
}

export interface PendingReportRow {
  lesson_id: string;
  starts_at: string;
  status: LessonStatus;
  teacher: { id: string; display_name_ar: string };
  student: StudentRef;
}

export interface UnpaidRow {
  id: string;
  student: StudentRef;
  package: PackageSize | null;
  lessons_total: number;
  owed: number;
  reason: 'owes' | 'renewal_due';
  currency: string;
}

export type TaskRow = AdminTaskView & { balance: { used: number; total: number } | null };

export interface DashboardWork {
  pending_reports: WorkList<PendingReportRow>;
  unpaid: WorkList<UnpaidRow>;
  tasks: WorkList<TaskRow>;
}

export type Summary = Pick<
  DashboardSummary,
  | 'active_students'
  | 'needs_confirmation'
  | 'pending_reports'
  | 'unpaid_subscriptions'
  | 'open_tasks'
>;
