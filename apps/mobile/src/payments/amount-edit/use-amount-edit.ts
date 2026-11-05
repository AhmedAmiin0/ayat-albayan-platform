import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { apiSend } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';

/** The amount edit the sheet runs: the new amount in, nothing back (the lists refetch). */
export type AmountEditMutation = ReturnType<typeof useAmountEdit>;

/** One PATCH, then every list or balance that shows the payment, its package or its money. */
function useAmountEdit(send: (amount: number) => Promise<void>, stale: readonly QueryKey[]) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['payments', 'edit-amount'],
    mutationFn: send,
    onSuccess: () => {
      for (const queryKey of stale) void client.invalidateQueries({ queryKey });
    },
  });
}

/**
 * The admin's «تعديل المبلغ»: PATCH /payments/:id { amount } only. The payments list, the
 * packages' paid state, the receivables and the student's balance refetch.
 */
export function useAdminAmountEdit(payment: { id: string; student: { id: string } }) {
  return useAmountEdit(
    (amount) => apiSend('PATCH', `/payments/${payment.id}`, { amount }),
    [pathKey('/payments'), pathKey('/subscriptions'), pathKey('/receivables'), ['students', payment.student.id]],
  );
}

/**
 * Hers (subscriptions.edit_terms): PATCH /sales/payments/:id/amount { amount }. Her payments, her
 * earnings (the commission follows) and the family's open packages refetch.
 */
export function useSalesAmountEdit(paymentId: string) {
  return useAmountEdit(
    (amount) => apiSend('PATCH', `/sales/payments/${paymentId}/amount`, { amount }),
    [pathKey('/sales/me'), pathKey('/sales/money'), pathKey('/sales/students'), pathKey('/sales/subscriptions')],
  );
}
