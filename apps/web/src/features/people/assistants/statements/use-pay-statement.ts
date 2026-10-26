import { uploadOnce } from '@ab/client-core';
import type { PaymentMethod } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { paidAtFor } from '@/features/finance/payments/api';
import { ASSISTANTS_KEY, payStatement, uploadStatementReceipt } from '../api';

export type PayStatementInput = { day: string; method: PaymentMethod; note: string; file: File | null };

/** «تأكيد الدفع»: the receipt goes up once per file, then POST /assistant-pay/statements/:id/pay. */
export function usePayStatement(statementId: string, assistantId: string, onSaved: () => void) {
  const queryClient = useQueryClient();
  const [receiptOnce] = useState(() => uploadOnce<File>());

  const receiptPath = (file: File | null): Promise<string | null> =>
    file ? receiptOnce(file, () => uploadStatementReceipt(file, assistantId)) : Promise.resolve(null);

  return useMutation({
    mutationFn: async (input: PayStatementInput) =>
      payStatement({
        id: statementId,
        body: { paidAt: paidAtFor(input.day), method: input.method, note: input.note.trim() || null, receiptPath: await receiptPath(input.file) },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ASSISTANTS_KEY });
      onSaved();
    },
  });
}
