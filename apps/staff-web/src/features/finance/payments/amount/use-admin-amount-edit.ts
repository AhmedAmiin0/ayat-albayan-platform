import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MONEY_KEY } from '@/features/finance/subscriptions';
import { updatePayment } from '@/features/finance/payments/api';

/** Every money read sits under MONEY_KEY, so it refreshes together. */
export function useAdminAmountEdit(paymentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => updatePayment(paymentId, { amount }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MONEY_KEY }),
  });
}
