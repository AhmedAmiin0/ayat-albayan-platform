import type {
  AdminTaskView,
  DashboardSummary,
  ExpenseCategory,
  LessonStatus,
  PackageSize,
  SourceRow,
} from '@ab/shared';

// TODO(R-RPT-02): lift these additive fields into @ab/shared money/dashboard-views.ts (foundation,
// read-only for this builder); apps/web/src/features/dashboard/types.ts mirrors them until then.

export type SourceKey = SourceRow['source'];

/** One month of the range (Riyadh months), in the reporting currency. */
export interface MonthFinance {
  month: string;
  revenue: number;
  teacher_cost: number;
  expenses: number;
  gross_margin: number;
}

/** GET /dashboard/summary: the docs/11 D1 contract plus monthly and per-category finance. */
export type DashboardResponse = DashboardSummary & {
  finance: DashboardSummary['finance'] & {
    by_month: MonthFinance[];
    expenses_by_category: Record<ExpenseCategory, number>;
    /** Units of each currency per 1 reporting unit, as used (the reporting currency is 1). */
    fx_rates: Record<string, number>;
    /** Paid lessons whose teacher has no rate for that duration: their cost is not counted. */
    unrated_lessons: number;
  };
};

export interface WorkList<T> {
  total: number;
  /** Oldest first, at most WORK_ITEMS. */
  items: T[];
}

export interface PendingReportRow {
  lesson_id: string;
  starts_at: string;
  status: LessonStatus;
  teacher: { id: string; display_name_ar: string };
  student: { id: string; code: string; name: string };
}

export interface UnpaidRow {
  id: string;
  student: { id: string; code: string; name: string };
  package: PackageSize | null;
  lessons_total: number;
  price: number;
  currency: string;
  starts_on: string;
}

/** A task plus its package's use, so the UI can word «فاضل حلقتين». */
export type TaskRow = AdminTaskView & { balance: { used: number; total: number } | null };

/** GET /dashboard/work: the admin's queue behind the KPI strip (docs/07 §6). */
export interface DashboardWork {
  pending_reports: WorkList<PendingReportRow>;
  unpaid: WorkList<UnpaidRow>;
  tasks: WorkList<TaskRow>;
}

export const WORK_ITEMS = 20;
