import { uploadOnce } from '@ab/client-core';
import type { ExpenseView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiSend } from '@/core/lib/http/api';
import { expenseBody, type ExpenseDraft } from './expense-draft';
import { uploadExpenseReceipt } from './upload-expense-receipt';

/**
 * «حفظ المصروف»: the receipt photo goes up first, once (a retry after a failed POST does not upload
 * it again), then POST /expenses. A save refused by the API keeps the form as it was.
 */
export function useAddExpense() {
  const client = useQueryClient();
  const [receiptOnce] = useState(() => uploadOnce<string>());
  return useMutation({
    mutationFn: async (draft: ExpenseDraft) => {
      const { receipt } = draft;
      const path = receipt ? await receiptOnce(receipt.uri, () => uploadExpenseReceipt(receipt)) : null;
      return apiSend<ExpenseView>('POST', '/expenses', expenseBody(draft, path, new Date()));
    },
    onSuccess: () => Promise.all(['expenses', 'dashboard'].map((key) => client.invalidateQueries({ queryKey: [key] }))),
  });
}
