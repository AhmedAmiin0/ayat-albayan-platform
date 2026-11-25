import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMyPaymentAmount } from '@/features/sales/sales/api';
import { myMoneyKeys, salesMoneyKeys, salesSubscriptionKeys } from '@/features/sales/keys';

/** PATCH /sales/payments/:id/amount needs subscriptions.edit_terms; her money reads refresh. */
export function useMyPaymentAmount(paymentId: string) {
  const queryClient = useQueryClient();
  const refresh = (queryKey: readonly unknown[]) => queryClient.invalidateQueries({ queryKey });
  return useMutation({
    mutationFn: (amount: number) => updateMyPaymentAmount(paymentId, amount),
    onSuccess: () =>
      Promise.all([myMoneyKeys.all, salesMoneyKeys.all, salesSubscriptionKeys.all].map(refresh)),
  });
}
