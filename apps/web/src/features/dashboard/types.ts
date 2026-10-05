import type {
  AdminTaskView,
  DashboardSummary,
  LessonStatus,
  PackageSize,
} from '@ab/shared';

// Mirrors apps/api/src/modules/dashboard/dashboard.types.ts (the additive fields on top of the
// docs/11 D1 contract). TODO(R-RPT-02): import both from @ab/shared once lifted there.

export type MonthFinance = { month: string; revenue: number; teacher_cost: number; expenses: number; gross_margin: number };

/** GET /dashboard/summary. */
export type DashboardData = DashboardSummary & {
  finance: DashboardSummary['finance'] & {
    by_month: MonthFinance[];
    expenses_by_category: Record<string, number>;
    fx_rates: Record<string, number>;
    unrated_lessons: number;
  };
};

export type WorkList<T> = { total: number; items: T[] };

export type PendingReportRow = {
  lesson_id: string;
  starts_at: string;
  status: LessonStatus;
  teacher: { id: string; display_name_ar: string };
  student: { id: string; code: string; name: string };
};

export type UnpaidRow = {
  id: string;
  student: { id: string; code: string; name: string };
  package: PackageSize | null;
  lessons_total: number;
  price: number;
  paid: number;
  owed: number;
  /** owes: money is still due; renewal_due: paid in full and used up. */
  reason: 'owes' | 'renewal_due';
  currency: string;
  starts_on: string;
};

export type TaskRow = AdminTaskView & { balance: { used: number; total: number } | null };

/** GET /dashboard/work. */
export type DashboardWork = {
  pending_reports: WorkList<PendingReportRow>;
  unpaid: WorkList<UnpaidRow>;
  tasks: WorkList<TaskRow>;
};

/** Local Riyadh days, inclusive. */
export type DayRange = { from: string; to: string };
