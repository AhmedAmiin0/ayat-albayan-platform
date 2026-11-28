import { payoutCalls, teacherEarningCalls } from '@ab/client-core';
import { riyadhToday } from '@ab/time';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend, call } from '@ab/web-kit';
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

/**
 * The month's CSV (GET /exports/payouts.csv, docs/11 §9) through the authorised fetch, saved via a
 * Blob link (a plain href cannot carry the bearer token). The BOM is put back: the browser's
 * text decoding drops it and Excel needs it for Arabic.
 */
export async function downloadPayoutsCsv(month: string): Promise<void> {
  const text: unknown = await call({ path: `/exports/payouts.csv?month=${month}` });
  const csv = typeof text === 'string' ? text : JSON.stringify(text);
  const bom = String.fromCharCode(0xfeff);
  const body = bom + (csv.startsWith(bom) ? csv.slice(1) : csv);
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `payouts-${month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** This month in Riyadh, YYYY-MM (the academy's reporting clock). */
export function currentMonth(now = new Date()): string {
  // academy day (docs/34 b): the payroll month is a Riyadh month
  return riyadhToday(now).slice(0, 7);
}
