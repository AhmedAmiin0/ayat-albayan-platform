import { useMutation, useQueryClient } from '@tanstack/react-query';
import { editUsedBefore, MONEY_KEY } from '@/features/finance/subscriptions/api';

export interface EditUsedBeforeOptions {
  subscriptionId: string;
  /** What else the edit makes stale (the sales history); the admin's money always. */
  staleKey?: readonly unknown[] | undefined;
  onSaved: () => void;
}

/** PATCH /subscriptions/:id/lessons-used-before, then the balances shown are read again. */
export function useEditUsedBefore({ subscriptionId, staleKey, onSaved }: EditUsedBeforeOptions) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (n: number) => editUsedBefore(subscriptionId, n),
    onSuccess: async () => {
      const keys = [MONEY_KEY, ...(staleKey ? [staleKey] : [])];
      await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      onSaved();
    },
  });
}
