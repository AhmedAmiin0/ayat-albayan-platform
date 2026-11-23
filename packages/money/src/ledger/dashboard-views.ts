import type { LeadSource, LeadStatus, LessonStatus } from '@ab/catalog';

// GET /dashboard/summary (docs/11 §8). Money in settings.reporting_currency.

export interface SourceRow {
  source: LeadSource | 'unknown';
  leads: number;
  converted: number;
  revenue: number;
  teacher_cost: number;
  gross_margin: number;
}

/** GET /dashboard/summary?from&to (R-RPT-01, R-RPT-02). Every count comes from a status. */
export interface DashboardSummary {
  range: { from: string; to: string };
  /** Leads created in the range, by their current status. */
  funnel: Record<LeadStatus, number>;
  active_students: number;
  /** Lessons starting in the range, by status. */
  lessons_by_status: Record<LessonStatus, number>;
  /** Scheduled lessons in the next 48 h that nobody confirmed yet. */
  needs_confirmation: number;
  pending_reports: number;
  unpaid_subscriptions: number;
  open_tasks: number;
  teacher_load: {
    teacher_id: string;
    display_name_ar: string;
    lessons: number;
    students: number;
    max_students: number | null;
  }[];
  finance: {
    /** settings.reporting_currency. */
    currency: string;
    revenue: number;
    teacher_cost: number;
    expenses: number;
    gross_margin: number;
    by_source: SourceRow[];
    /** Rate date used for the conversion; null when every amount was already in `currency`. */
    fx_date: string | null;
    /** Currencies with no stored rate: their amounts are left out (shown as a warning). */
    fx_missing: string[];
  };
}

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
    expenses_by_category: Record<string, number>;
    /** Units of each currency per 1 reporting unit, as used (the reporting currency is 1). */
    fx_rates: Record<string, number>;
    /** Paid lessons whose teacher has no rate for that duration: their cost is not counted. */
    unrated_lessons: number;
  };
};

/** The KPI strip's counts, the part of GET /dashboard/summary a client reads for its badges. */
export type DashboardCounts = Pick<
  DashboardSummary,
  'active_students' | 'needs_confirmation' | 'pending_reports' | 'unpaid_subscriptions' | 'open_tasks'
>;
