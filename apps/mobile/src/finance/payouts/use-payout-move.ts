import { uploadOnce } from '@ab/client-core';
import type { PayoutView } from '@ab/shared';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { uploadTeacherReceipt } from '@/earnings/hooks/upload-receipt';
import { apiSend } from '@/core/lib/http/api';
import { payBody, type PayDraft } from './payout-actions';

/** Money moved: the month list, the teacher's ledger, the summaries and the money lists (payments, receivables) all re-read. */
export const refreshMoney = (client: QueryClient) =>
  Promise.all(['payouts', 'teacher-earnings', 'dashboard', 'payments', 'receivables'].map((key) => client.invalidateQueries({ queryKey: [key] })));

export type PayoutMove = { id: string; move: 'approve' | 'reopen' } | { id: string; move: 'unpay'; reason: string };

/** approve / reopen / unpay: the server owns every rule (month over, reports done, a reason of 3+ letters). */
export function usePayoutMove() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (m: PayoutMove) =>
      apiSend<PayoutView>('POST', `/payouts/${m.id}/${m.move}`, m.move === 'unpay' ? { reason: m.reason } : undefined),
    onSuccess: () => refreshMoney(client),
  });
}

/**
 * «تأكيد الدفع»: the receipt goes up once (a retry after a failed POST does not upload it again),
 * then POST /payouts/:id/pay settles the ledger and marks the month paid in one transaction.
 */
export function usePayPayout(payout: PayoutView) {
  const client = useQueryClient();
  const [receiptOnce] = useState(() => uploadOnce<string>());
  return useMutation({
    mutationFn: async (draft: PayDraft) => {
      const { receipt } = draft;
      const path = receipt ? await receiptOnce(receipt.uri, () => uploadTeacherReceipt(payout.teacher.id, receipt)) : null;
      return apiSend<PayoutView>('POST', `/payouts/${payout.id}/pay`, payBody(draft, path, new Date()));
    },
    onSuccess: () => refreshMoney(client),
  });
}
