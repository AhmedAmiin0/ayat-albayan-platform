import { type DateRangeQuery, type LeadSource, type LeadStatus } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { sourceRows } from '../dashboard.mapper';
import type { DashboardResponse } from '../dashboard.types';
import { DashboardSettings } from '../dashboard.settings';
import { financeTotals } from './finance';
import { costFacts, currenciesOf, expenseFacts, paymentFacts } from './finance.mapper';
import { FinanceQueries } from './finance.queries';
import { FxConverter } from './fx-converter';
import { monthsOf, rangeWindow } from '../range';

export interface FinanceInput {
  range: DateRangeQuery;
  /** Leads created in the range, for the source rows. */
  leads: readonly { source: LeadSource; status: LeadStatus }[];
}

/** The summary's `finance` block (R-RPT-02, issue E4), in settings.reporting_currency. */
@Injectable()
export class FinanceService {
  constructor(
    private readonly money: FinanceQueries,
    private readonly fx: FxConverter,
    private readonly settings: DashboardSettings,
  ) {}

  async finance({ range, leads }: FinanceInput): Promise<DashboardResponse['finance']> {
    const w = rangeWindow(range);
    const months = monthsOf(range);
    const settings = await this.settings.read();
    const [first, last] = [months[0] ?? range.from.slice(0, 7), months.at(-1) ?? range.to.slice(0, 7)];
    const [paymentRows, lessonRows, expenseRows] = await Promise.all([
      this.money.payments(w),
      this.money.payableLessons(w),
      this.money.expenses(first, last),
    ]);
    const students = await this.money.lessonSources(lessonRows.flatMap((l) => (l.amount === null ? [] : [l.lesson_id])));
    const payments = paymentFacts(paymentRows);
    const costs = costFacts(lessonRows, students);
    const expenses = expenseFacts(expenseRows);
    const conversion = await this.fx.conversion(
      settings.reporting_currency,
      currenciesOf(payments, costs.facts, expenses),
    );
    const { by_source, ...totals } = financeTotals({ conversion, months, payments, costs: costs.facts, expenses });
    return {
      currency: conversion.currency,
      ...totals,
      by_source: sourceRows(leads, by_source),
      fx_date: conversion.date,
      fx_missing: conversion.missing,
      fx_rates: conversion.rates,
      unrated_lessons: costs.unrated,
    };
  }
}
