import type { PaymentMethod } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { paidAtFor } from '@/features/payments/api';
import { ASSISTANTS_KEY, payStatement, uploadStatementReceipt } from './api';

export type PayStatementInput = { day: string; method: PaymentMethod; note: string; file: File | null };

/** «تأكيد الدفع»: the receipt goes up once per file, then POST /assistant-pay/statements/:id/pay. */
export function usePayStatement(statementId: string, assistantId: string, onSaved: () => void) {
  const queryClient = useQueryClient();
  const uploaded = useRef<{ file: File; path: string } | null>(null);

  async function receiptPath(file: File | null): Promise<string | null> {
    if (!file) return null;
    if (uploaded.current?.file === file) return uploaded.current.path;
    const path = await uploadStatementReceipt(file, assistantId);
    uploaded.current = { file, path };
    return path;
  }

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
