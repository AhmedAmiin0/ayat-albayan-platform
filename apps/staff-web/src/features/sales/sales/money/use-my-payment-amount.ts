import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MY_MONEY_KEY, updateMyPaymentAmount } from '@/features/sales/sales/api';

/** Her chat money reads (open packages, what is due) and her subscriptions' paid state. */
const SALES_MONEY_KEY = ['sales', 'money'] as const;
const SALES_SUBSCRIPTIONS_KEY = ['sales', 'subscriptions'] as const;

/** PATCH /sales/payments/:id/amount needs subscriptions.edit_terms; her money reads refresh. */
export function useMyPaymentAmount(paymentId: string) {
  const queryClient = useQueryClient();
  const refresh = (queryKey: readonly string[]) => queryClient.invalidateQueries({ queryKey });
  return useMutation({
    mutationFn: (amount: number) => updateMyPaymentAmount(paymentId, amount),
    onSuccess: () =>
      Promise.all([MY_MONEY_KEY, SALES_MONEY_KEY, SALES_SUBSCRIPTIONS_KEY].map(refresh)),
  });
}
