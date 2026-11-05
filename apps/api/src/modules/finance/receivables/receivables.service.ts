import { receivablesOf, receivableTotals, type ReceivablesView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { convert, round2 } from '@/modules/reporting/dashboard/work/conversion';
import { riyadhDate } from '@/modules/reporting/dashboard/range';
import { FxConverter } from '@/modules/reporting/dashboard/finance/fx-converter';
import { ReceivablesRepo } from './receivables.repo';
import { ReceivablesSettings } from './receivables.settings';
import { withStoppedCharge } from './receivables.stopped';

/**
 * GET /receivables: every package that still owes (price − net paid; a stopped course: its attended
 * lessons at the refund rate − net paid, withStoppedCharge), its days since the package
 * started and aging bucket, totals per currency, and one total in settings.reporting_currency
 * (a currency without a rate is listed in fx_missing and left out of it).
 */
@Injectable()
export class ReceivablesService {
  constructor(
    private readonly queries: ReceivablesRepo,
    private readonly fx: FxConverter,
    private readonly settings: ReceivablesSettings,
  ) {}

  async list(now = new Date()): Promise<ReceivablesView> {
    const [pkgs, settings] = await Promise.all([this.queries.packages(), this.settings.read()]);
    const subs = withStoppedCharge(pkgs, settings.refund_attended_rate_percent);
    const paid = await this.queries.paid(subs.map((s) => s.id));
    const rows = receivablesOf({ subs, paid, today: riyadhDate(now.toISOString()) });
    const totals = receivableTotals(rows);
    const conversion = await this.fx.conversion(settings.reporting_currency, totals.map((t) => t.currency));
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
