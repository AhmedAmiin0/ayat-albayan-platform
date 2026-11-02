import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MY_MONEY_KEY, updateMyPaymentAmount } from '@/features/sales/sales/api';

/** Her chat money reads (open packages, what is due) and her subscriptions' paid state. */
const SALES_MONEY_KEY = ['sales', 'money'] as const;
const SALES_SUBSCRIPTIONS_KEY = ['sales', 'subscriptions'] as const;

/**
 * «تعديل المبلغ» by the assistant (payments.edit_amount): PATCH /sales/payments/:id/amount, then
 * «مدفوعاتي» / «محفظتي» (commission), the family's packages owed and her subscriptions refresh.
 */
export function useMyPaymentAmount(paymentId: string) {
  const queryClient = useQueryClient();
  const refresh = (queryKey: readonly string[]) => queryClient.invalidateQueries({ queryKey });
  return useMutation({
    mutationFn: (amount: number) => updateMyPaymentAmount(paymentId, amount),
    onSuccess: () =>
      Promise.all([MY_MONEY_KEY, SALES_MONEY_KEY, SALES_SUBSCRIPTIONS_KEY].map(refresh)),
  });
}
