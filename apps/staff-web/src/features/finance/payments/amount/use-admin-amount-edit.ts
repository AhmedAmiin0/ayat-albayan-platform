import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MONEY_KEY } from '@/features/finance/subscriptions';
import { updatePayment } from '@/features/finance/payments/api';

/**
 * «تعديل المبلغ» by the admin: PATCH /payments/:id with the amount only; every money read (the
 * payments, the package's paid / status, balances, tasks) sits under MONEY_KEY.
 */
export function useAdminAmountEdit(paymentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => updatePayment(paymentId, { amount }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MONEY_KEY }),
  });
}
