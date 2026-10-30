import { uploadOnce } from '@ab/client-core';
import type { PaymentMethod } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { paidAtFor } from '@/features/finance/payments/api';
import { MONEY_KEY } from '@/features/finance/subscriptions/api';
import { uploadTeacherReceipt } from '@/features/finance/teacher-earnings/api';
import { payPayout, type PayoutView } from '../api';

export type PayPayoutInput = { day: string; method: PaymentMethod; note: string; file: File | null };

/**
 * «تأكيد الدفع» of a monthly payout: the receipt is uploaded once per file to the teacher's
 * receipts folder (the per-session pay dialog's pattern), then POST /payouts/:id/pay.
 */
export function usePayPayout(payout: PayoutView, onSaved: () => void) {
  const queryClient = useQueryClient();
  const [receiptOnce] = useState(() => uploadOnce<File>());

  const receiptPath = (file: File | null): Promise<string | null> =>
    file ? receiptOnce(file, () => uploadTeacherReceipt({ teacherId: payout.teacher.id, file })) : Promise.resolve(null);

  return useMutation({
    mutationFn: async (input: PayPayoutInput) =>
      payPayout(payout.id, {
        paidAt: paidAtFor(input.day),
        method: input.method,
        note: input.note.trim() || null,
        receiptPath: await receiptPath(input.file),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MONEY_KEY });
      onSaved();
    },
  });
}
