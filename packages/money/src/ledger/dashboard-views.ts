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
  /** scheduled lessons in the next 48 h that nobody confirmed yet («يحتاج تأكيد»). */
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
