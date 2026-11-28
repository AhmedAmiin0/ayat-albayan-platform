import { payoutCalls, uploadOnce } from '@ab/client-core';
import type { PayoutView } from '@ab/money';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { uploadTeacherReceipt } from '@/earnings/hooks/upload-receipt';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { payBody, type PayDraft } from './payout-actions';

const payouts = payoutCalls({ apiFetch, apiSend });

/** Money moved: the month list, the teacher's ledger, the summaries and the money lists (payments, receivables) all re-read. */
export const refreshMoney = (client: QueryClient) =>
  Promise.all(
    ['payouts', 'teacher-earnings', 'dashboard', 'payments', 'receivables'].map((key) =>
      client.invalidateQueries({ queryKey: [key] }),
    ),
  );

type PayoutMove =
  | { id: string; move: 'approve' | 'reopen' }
  | { id: string; move: 'unpay'; reason: string };

/** approve / reopen / unpay: the server owns every rule (month over, reports done, a reason of 3+ letters). */
export function usePayoutMove() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (m: PayoutMove) =>
      m.move === 'unpay' ? payouts.unpay(m.id, m.reason) : payouts[m.move](m.id),
    onSuccess: () => refreshMoney(client),
  });
}

/** The receipt uploads once; the pay POST settles the ledger and the month atomically. */
export function usePayPayout(payout: PayoutView) {
  const client = useQueryClient();
  const [receiptOnce] = useState(() => uploadOnce<string>());
  return useMutation({
    mutationFn: async (draft: PayDraft) => {
      const { receipt } = draft;
      const path = receipt
        ? await receiptOnce(receipt.uri, () => uploadTeacherReceipt(payout.teacher.id, receipt))
        : null;
      const body = payBody(draft, path, new Date());
      return payouts.pay(payout.id, body);
    },
    onSuccess: () => refreshMoney(client),
  });
}
