import type { LeadSource, LeadStatus } from '@ab/catalog';
import type { DateRangeQuery } from '@ab/money';
import { Injectable } from '@nestjs/common';
import { sourceRows } from '@/modules/reporting/dashboard/dashboard.mapper';
import { DashboardSettings } from '@/modules/reporting/dashboard/dashboard.settings';
import { financeTotals } from './finance';
import { cardFacts, currenciesOf } from './finance.mapper';
import { FinanceRepo } from './finance.repo';
import { FxConverter } from './fx-converter';
import { monthsOf, rangeWindow } from '@/modules/reporting/dashboard/range';
import type { DashboardResponse } from '@ab/money';

interface FinanceInput {
  range: DateRangeQuery;
  /** Leads created in the range, for the source rows. */
  leads: readonly { source: LeadSource; status: LeadStatus }[];
}

/** The summary's `finance` block (R-RPT-02, issue E4), in settings.reporting_currency. */
@Injectable()
export class FinanceService {
  constructor(
    private readonly money: FinanceRepo,
    private readonly fx: FxConverter,
    private readonly settings: DashboardSettings,
  ) {}

  async finance({ range, leads }: FinanceInput): Promise<DashboardResponse['finance']> {
    const months = monthsOf(range);
    const settings = await this.settings.read();
    const [first, last] = [
      months[0] ?? range.from.slice(0, 7),
      months.at(-1) ?? range.to.slice(0, 7),
    ];
    const { payments, costs, expenses, unrated } = cardFacts(
      await this.money.totals({ window: rangeWindow(range), first, last }),
    );
    const conversion = await this.fx.conversion(
      settings.reporting_currency,
      currenciesOf(payments, costs, expenses),
    );
    const { by_source, ...totals } = financeTotals({
      conversion,
      months,
      payments,
      costs,
      expenses,
    });
    return {
      currency: conversion.currency,
      ...totals,
      by_source: sourceRows(leads, by_source),
      fx_date: conversion.date,
      fx_missing: conversion.missing,
      fx_rates: conversion.rates,
      unrated_lessons: unrated,
    };
  }
}
