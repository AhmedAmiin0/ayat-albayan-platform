import { expenseCalls, uploadOnce } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { expenseBody, type ExpenseDraft } from './expense-draft';
import { uploadExpenseReceipt } from './upload-expense-receipt';

const calls = expenseCalls({ apiFetch, apiSend });

/** The receipt uploads once so a retry after a failed POST does not upload it again. */
export function useAddExpense() {
  const client = useQueryClient();
  const [receiptOnce] = useState(() => uploadOnce<string>());
  return useMutation({
    mutationFn: async (draft: ExpenseDraft) => {
      const { receipt } = draft;
      const path = receipt
        ? await receiptOnce(receipt.uri, () => uploadExpenseReceipt(receipt))
        : null;
      return calls.create(expenseBody(draft, path, new Date()));
    },
    onSuccess: () => Promise.all(['expenses', 'dashboard'].map((key) => client.invalidateQueries({ queryKey: [key] }))),
  });
}
