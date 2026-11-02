import type { PaymentAttachmentView, ReceivablesView, SignedDownload } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
import type { PeriodTotal } from './types';

const MINUTE = 60_000;

// A signed URL expires, so `noPersist` keeps it off the disk cache (lib/query-client): a restart
// would show a dead receipt.
const meta = { noPersist: true };

/** GET /receivables: every package that still owes, in one answer (no paging), oldest debt first. */
export function useReceivables() {
  return useQuery({
    queryKey: pathKey('/receivables'),
    queryFn: () => apiFetch<ReceivablesView>('/receivables'),
  });
}

/**
 * GET /payments/:id/receipt: a signed URL good for an hour, so cached for 30 minutes. Only asked
 * once the admin opens the receipt (`enabled`).
 */
export function useReceiptUrl(paymentId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...pathKey('/payments'), paymentId, 'receipt'],
    queryFn: () => apiFetch<SignedDownload>(`/payments/${paymentId}/receipt`),
    enabled,
    staleTime: 30 * MINUTE,
    meta,
  });
}

/**
 * GET `path` (/payments/:id/attachments, or /sales/me/payments/:id/attachments for her own): the
 * payment's «المرفقات», signed for an hour, so cached for 30 minutes. Only asked once opened (`enabled`).
 */
export function usePaymentAttachments(path: string, enabled: boolean) {
  return useQuery({
    queryKey: pathKey(path),
    queryFn: () => apiFetch<PaymentAttachmentView[]>(path),
    enabled,
    staleTime: 30 * MINUTE,
    meta,
  });
}

const isTotal = (v: unknown): v is PeriodTotal =>
  typeof v === 'object' && v !== null && 'currency' in v && 'net' in v;

/** The totals ride on the first page of GET /payments; a page without them is an empty list. */
export function periodTotals(first: unknown): PeriodTotal[] {
  const totals = typeof first === 'object' && first !== null && 'totals' in first ? first.totals : null;
  return Array.isArray(totals) ? totals.filter(isTotal) : [];
}
