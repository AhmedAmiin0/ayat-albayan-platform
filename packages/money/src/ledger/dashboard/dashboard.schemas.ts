import { LEAD_SOURCES, LEAD_STATUSES, LESSON_STATUSES } from '@ab/catalog';
import { localDate } from '@ab/core';
import { z } from 'zod';

// GET /dashboard/summary (docs/11 §8). Money in settings.reporting_currency.

export const dashboardSourceSchema = z.enum([...LEAD_SOURCES, 'unknown']);

export const sourceRowSchema = z.object({
  source: dashboardSourceSchema,
  leads: z.number(),
  converted: z.number(),
  revenue: z.number(),
  teacher_cost: z.number(),
  gross_margin: z.number(),
});

const teacherLoadSchema = z.object({
  teacher_id: z.string(),
  display_name_ar: z.string(),
  lessons: z.number(),
  students: z.number(),
  max_students: z.number().nullable(),
});

const summaryFinanceSchema = z.object({
  /** settings.reporting_currency. */
  currency: z.string(),
  revenue: z.number(),
  teacher_cost: z.number(),
  expenses: z.number(),
  gross_margin: z.number(),
  by_source: sourceRowSchema.array(),
  /** Rate date used for the conversion; null when every amount was already in `currency`. */
  fx_date: z.string().nullable(),
  /** Currencies with no stored rate: their amounts are left out (shown as a warning). */
  fx_missing: z.string().array(),
});

/** R-RPT-01, R-RPT-02: every count comes from a status. */
export const dashboardSummarySchema = z.object({
  range: z.object({ from: localDate, to: localDate }),
  /** Leads created in the range, by their current status. */
  funnel: z.record(z.enum(LEAD_STATUSES), z.number()),
  active_students: z.number(),
  /** Lessons starting in the range, by status. */
  lessons_by_status: z.record(z.enum(LESSON_STATUSES), z.number()),
  /** Scheduled lessons in the next 48 h that nobody confirmed yet. */
  needs_confirmation: z.number(),
  pending_reports: z.number(),
  unpaid_subscriptions: z.number(),
  open_tasks: z.number(),
  teacher_load: teacherLoadSchema.array(),
  finance: summaryFinanceSchema,
});

/** One month of the range (Riyadh months), in the reporting currency. */
export const monthFinanceSchema = z.object({
  month: z.string(),
  revenue: z.number(),
  teacher_cost: z.number(),
  expenses: z.number(),
  gross_margin: z.number(),
});

/** The docs/11 D1 summary plus monthly and per-category finance. */
export const dashboardResponseSchema = dashboardSummarySchema.extend({
  finance: summaryFinanceSchema.extend({
    by_month: monthFinanceSchema.array(),
    expenses_by_category: z.record(z.string(), z.number()),
    /** Units of each currency per 1 reporting unit, as used (the reporting currency is 1). */
    fx_rates: z.record(z.string(), z.number()),
    /** Paid lessons whose teacher has no rate for that duration: their cost is not counted. */
    unrated_lessons: z.number(),
  }),
});

/** The KPI strip's counts, the part of the summary a client reads for its badges. */
export const dashboardCountsSchema = dashboardSummarySchema.pick({
  active_students: true,
  needs_confirmation: true,
  pending_reports: true,
  unpaid_subscriptions: true,
  open_tasks: true,
});

export type DashboardSource = z.infer<typeof dashboardSourceSchema>;
export type SourceRow = z.infer<typeof sourceRowSchema>;
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type MonthFinance = z.infer<typeof monthFinanceSchema>;
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
export type DashboardCounts = z.infer<typeof dashboardCountsSchema>;
