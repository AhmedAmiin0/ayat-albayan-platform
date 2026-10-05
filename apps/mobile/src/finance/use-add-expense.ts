import type { ExpenseView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { apiSend } from '@/lib/api';
import { expenseBody, type ExpenseDraft } from './expense-draft';
import { uploadExpenseReceipt } from './upload-expense-receipt';

/**
 * «حفظ المصروف»: the receipt photo goes up first, once (a retry after a failed POST does not upload
 * it again), then POST /expenses. A save refused by the API keeps the form as it was.
 */
export function useAddExpense() {
  const client = useQueryClient();
  const uploaded = useRef<{ uri: string; path: string } | null>(null);
  return useMutation({
    mutationFn: async (draft: ExpenseDraft) => {
      if (draft.receipt && uploaded.current?.uri !== draft.receipt.uri) {
        uploaded.current = { uri: draft.receipt.uri, path: await uploadExpenseReceipt(draft.receipt) };
      }
      const path = draft.receipt ? (uploaded.current?.path ?? null) : null;
      return apiSend<ExpenseView>('POST', '/expenses', expenseBody(draft, path, new Date()));
    },
    onSuccess: () => Promise.all(['expenses', 'dashboard'].map((key) => client.invalidateQueries({ queryKey: [key] }))),
  });
}
