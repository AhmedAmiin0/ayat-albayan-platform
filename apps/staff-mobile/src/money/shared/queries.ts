import { paymentCalls, receivablesCall } from '@ab/client-core';
import { paymentAttachmentListSchema, periodTotalSchema, type PeriodTotal } from '@ab/money';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey, call } from '@ab/mobile-kit';
import { z } from 'zod';

const MINUTE = 60_000;
const receivables = receivablesCall({ apiFetch, apiSend });
const payments = paymentCalls({ apiFetch, apiSend });

// A signed URL expires, so `noPersist` keeps it off the disk cache (lib/query-client): a restart
// would show a dead receipt.
const meta = { noPersist: true };

/** GET /receivables: every package that still owes, in one answer (no paging), oldest debt first. */
export function useReceivables() {
  return useQuery({
    queryKey: pathKey('/receivables'),
    queryFn: receivables,
  });
}

/**
 * GET /payments/:id/receipt: a signed URL good for an hour, so cached for 30 minutes. Only asked
 * once the admin opens the receipt (`enabled`).
 */
export function useReceiptUrl(paymentId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...pathKey('/payments'), paymentId, 'receipt'],
    queryFn: () => payments.receipt(paymentId),
    enabled,
    staleTime: 30 * MINUTE,
    meta,
  });
}

/** URLs are signed for an hour, so cached for 30 minutes; fetched only once opened. */
export function usePaymentAttachments(path: string, enabled: boolean) {
  return useQuery({
    queryKey: pathKey(path),
    queryFn: () => call({ path, schema: paymentAttachmentListSchema }),
    enabled,
    staleTime: 30 * MINUTE,
    meta,
  });
}

const withTotals = z.object({ totals: z.array(z.unknown()) });

const asTotal = (value: unknown): PeriodTotal[] => {
  const total = periodTotalSchema.safeParse(value);
  return total.success ? [total.data] : [];
};

/** The totals ride on the first page of GET /payments; a page without them is an empty list. */
export function periodTotals(first: unknown): PeriodTotal[] {
  const page = withTotals.safeParse(first);
  return page.success ? page.data.totals.flatMap(asTotal) : [];
}
