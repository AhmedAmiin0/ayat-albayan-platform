import type { PaymentMethod, PayoutGenerateResult, PayoutView, SignedDownload, TeacherEarningsSummaryView } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';
import { MONEY_KEY } from '@/features/subscriptions/api';

// apps/api/src/modules/payouts (docs/11 §8, R-PAY-02, R-TCH-04). Teacher money is EGP.
export type { PayoutGenerateResult, PayoutView } from '@ab/shared';

export const payoutsQuery = (month: string) =>
  queryOptions({
    queryKey: [...MONEY_KEY, 'payouts', month],
    queryFn: () => apiFetch<PayoutView[]>(`/payouts?month=${month}`),
  });

export const generatePayouts = (month: string) =>
  apiSend<PayoutGenerateResult>('POST', `/payouts/${month}/generate`);

export const approvePayout = (id: string) => apiSend<PayoutView>('POST', `/payouts/${id}/approve`);

export type PayPayoutBody = { paidAt: string; method: PaymentMethod; note: string | null; receiptPath: string | null };

/** Settlement in the ledger + paid, one transaction (POST /payouts/:id/pay). */
export const payPayout = (id: string, body: PayPayoutBody) => apiSend<PayoutView>('POST', `/payouts/${id}/pay`, body);

export const reopenPayout = (id: string) => apiSend<PayoutView>('POST', `/payouts/${id}/reopen`);

export const unpayPayout = (id: string, reason: string) => apiSend<PayoutView>('POST', `/payouts/${id}/unpay`, { reason });

export const payoutReceiptUrl = (id: string) => apiFetch<SignedDownload>(`/payouts/${id}/receipt`);

/** «مستحقات المعلمين»: earned / paid / owed per teacher from the ledger. */
export const earningsSummaryQuery = () =>
  queryOptions({
    queryKey: [...MONEY_KEY, 'teacher-earnings', 'summary'],
    queryFn: () => apiFetch<TeacherEarningsSummaryView>('/teacher-earnings/summary'),
  });

/**
 * The month's CSV (GET /exports/payouts.csv, docs/11 §9) through the authorised fetch, saved via a
 * Blob link (a plain href cannot carry the bearer token). The BOM is put back: the browser's
 * text decoding drops it and Excel needs it for Arabic.
 */
export async function downloadPayoutsCsv(month: string): Promise<void> {
  const text = await apiFetch<string>(`/exports/payouts.csv?month=${month}`);
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
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }).slice(0, 7);
}
