import type { PaymentMethod } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { paidAtFor } from '@/features/finance/payments/api';
import { MONEY_KEY } from '@/features/finance/subscriptions/api';
import { uploadTeacherReceipt } from '@/features/finance/teacher-earnings/api';
import { payPayout, type PayoutView } from './api';

export type PayPayoutInput = { day: string; method: PaymentMethod; note: string; file: File | null };

/**
 * «تأكيد الدفع» of a monthly payout: the receipt is uploaded once per file to the teacher's
 * receipts folder (the per-session pay dialog's pattern), then POST /payouts/:id/pay.
 */
export function usePayPayout(payout: PayoutView, onSaved: () => void) {
  const queryClient = useQueryClient();
  const uploaded = useRef<{ file: File; path: string } | null>(null);

  async function receiptPath(file: File | null): Promise<string | null> {
    if (!file) return null;
    if (uploaded.current?.file === file) return uploaded.current.path;
    const path = await uploadTeacherReceipt({ teacherId: payout.teacher.id, file });
    uploaded.current = { file, path };
    return path;
  }

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
