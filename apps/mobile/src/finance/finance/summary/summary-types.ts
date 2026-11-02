import type { DashboardSummary } from '@ab/shared';

// Mirrors apps/web/src/features/dashboard/types.ts (the dashboard module's additive fields).
export type MonthFinance = { month: string; revenue: number; teacher_cost: number; expenses: number; gross_margin: number };

/** GET /dashboard/summary?from&to, money in settings.reporting_currency. */
export type FinanceSummary = {
  finance: DashboardSummary['finance'] & { by_month: MonthFinance[]; unrated_lessons: number };
};
