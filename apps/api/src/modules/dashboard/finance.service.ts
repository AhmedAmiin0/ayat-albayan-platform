import { payoutStatuses, type DateRangeQuery, type LeadSource, type LeadStatus } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { SettingsService } from '../../common/settings/settings.service';
import { sourceRows } from './dashboard.mapper';
import type { DashboardResponse } from './dashboard.types';
import { financeTotals } from './finance';
import { costFacts, currenciesOf, expenseFacts, frozenRates, paymentFacts } from './finance.mapper';
import { FinanceQueries } from './finance.queries';
import { FxConverter } from './fx-converter';
import { monthShift, monthsOf, rangeWindow } from './range';

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
    private readonly settings: SettingsService,
  ) {}

  async finance({ range, leads }: FinanceInput): Promise<DashboardResponse['finance']> {
    const w = rangeWindow(range);
    const months = monthsOf(range);
    const settings = await this.settings.all();
    const paid = payoutStatuses({ countLate: settings.payout_count_late, countNoShow: settings.payout_count_no_show });
    const [first, last] = [months[0] ?? range.from.slice(0, 7), months.at(-1) ?? range.to.slice(0, 7)];
    const [paymentRows, lessonRows, expenseRows, payouts] = await Promise.all([
      this.money.payments(w),
      this.money.paidLessons(w, paid),
      this.money.expenses(first, last),
      // ±1 month: payouts bucket lessons by the teacher's tz month, the dashboard by Riyadh's.
      this.money.frozenPayouts(monthShift(first, -1), monthShift(last, 1)),
    ]);
    const payments = paymentFacts(paymentRows);
    const costs = costFacts(lessonRows, frozenRates(payouts));
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
