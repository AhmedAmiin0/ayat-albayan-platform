import type { PayoutView } from '@ab/shared';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
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
  const uploaded = useRef<{ uri: string; path: string } | null>(null);
  return useMutation({
    mutationFn: async (draft: PayDraft) => {
      if (draft.receipt && uploaded.current?.uri !== draft.receipt.uri) {
        uploaded.current = { uri: draft.receipt.uri, path: await uploadTeacherReceipt(payout.teacher.id, draft.receipt) };
      }
      const path = draft.receipt ? (uploaded.current?.path ?? null) : null;
      return apiSend<PayoutView>('POST', `/payouts/${payout.id}/pay`, payBody(draft, path, new Date()));
    },
    onSuccess: () => refreshMoney(client),
  });
}
