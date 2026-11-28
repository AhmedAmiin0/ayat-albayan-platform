import { uploadOnce } from '@ab/client-core';
import type { PaymentMethod } from '@ab/catalog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { paidAtFor } from '@/features/finance/payments';
import { ASSISTANTS_KEY, payStatement, uploadStatementReceipt } from '@/features/people/assistants/api';

export interface PayStatementInput {
  day: string;
  method: PaymentMethod;
  note: string;
  file: File | null;
}

/** The receipt uploads once per file before the pay request. */
export function usePayStatement(statementId: string, assistantId: string, onSaved: () => void) {
  const queryClient = useQueryClient();
  const [receiptOnce] = useState(() => uploadOnce<File>());

  const receiptPath = (file: File | null): Promise<string | null> =>
    file
      ? receiptOnce(file, () => uploadStatementReceipt(file, assistantId))
      : Promise.resolve(null);

  return useMutation({
    mutationFn: async (input: PayStatementInput) =>
      payStatement({
        id: statementId,
        body: {
          paidAt: paidAtFor(input.day),
          method: input.method,
          note: input.note.trim() || null,
          receiptPath: await receiptPath(input.file),
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ASSISTANTS_KEY });
      onSaved();
    },
  });
}
