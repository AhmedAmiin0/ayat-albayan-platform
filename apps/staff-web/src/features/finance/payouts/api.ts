import { payoutCalls, teacherEarningCalls } from '@ab/client-core';
import { riyadhToday } from '@ab/time';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { moneyKeys } from '@/features/finance/keys';

// apps/api/src/modules/payouts (docs/11 §8, R-PAY-02, R-TCH-04). Teacher money is EGP.
export type { PayoutGenerateResult, PayoutView } from '@ab/money';

const earnings = teacherEarningCalls({ apiFetch, apiSend });
const payouts = payoutCalls({ apiFetch, apiSend });

export const payoutsQuery = (month: string) =>
  queryOptions({
    queryKey: moneyKeys.payouts(month),
    queryFn: () => payouts.month(month),
  });

export const generatePayouts = payouts.generate;

export const approvePayout = payouts.approve;

/** Settlement in the ledger + paid, one transaction (POST /payouts/:id/pay). */
export const payPayout = payouts.pay;

export const reopenPayout = payouts.reopen;

export const unpayPayout = payouts.unpay;

export const payoutReceiptUrl = payouts.receipt;

/** Earned, paid and owed per teacher from the ledger. */
export const earningsSummaryQuery = () =>
  queryOptions({
    queryKey: moneyKeys.earningsSummary(),
    queryFn: earnings.summary,
  });

/** This month in Riyadh, YYYY-MM (the academy's reporting clock). */
export function currentMonth(now = new Date()): string {
  // academy day (docs/34 b): the payroll month is a Riyadh month
  return riyadhToday(now).slice(0, 7);
}
