import { receivablesOf, receivableTotals, type ReceivablesView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { convert, round2 } from '../dashboard/work/conversion';
import { riyadhDate } from '../dashboard/range';
import { FxConverter } from '../dashboard/finance/fx-converter';
import { ReceivablesQueries } from './receivables.queries';
import { ReceivablesSettings } from './receivables.settings';

/**
 * GET /receivables: every package that still owes (price − net paid), its days since the package
 * started and aging bucket, totals per currency, and one total in settings.reporting_currency
 * (a currency without a rate is listed in fx_missing and left out of it).
 */
@Injectable()
export class ReceivablesService {
  constructor(
    private readonly queries: ReceivablesQueries,
    private readonly fx: FxConverter,
    private readonly settings: ReceivablesSettings,
  ) {}

  async list(now = new Date()): Promise<ReceivablesView> {
    const subs = await this.queries.packages();
    const paid = await this.queries.paid(subs.map((s) => s.id));
    const rows = receivablesOf({ subs, paid, today: riyadhDate(now.toISOString()) });
    const totals = receivableTotals(rows);
    const conversion = await this.fx.conversion((await this.settings.read()).reporting_currency, totals.map((t) => t.currency));
    const total = totals.reduce((n, t) => n + (convert(conversion, t.owed, t.currency) ?? 0), 0);
    return {
      rows,
      totals,
      total: round2(total),
      currency: conversion.currency,
      fx_missing: conversion.missing,
    };
  }
}
