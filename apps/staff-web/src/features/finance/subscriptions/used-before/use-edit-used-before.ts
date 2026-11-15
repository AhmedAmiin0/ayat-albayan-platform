import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { ApiError } from '@/lib/http/api';
import { editUsedBefore, MONEY_KEY, usedBeforeStateQuery } from '@/features/finance/subscriptions/api';

export interface EditUsedBeforeOptions {
  subscriptionId: string;
  onSaved: () => void;
}

// Every view showing lessons left: the admin's money and profile, the assistant's sales views
// (the subscription history included).
const ALWAYS: readonly (readonly unknown[])[] = [MONEY_KEY, ['students'], ['sales']];

const changedBody = z.object({ code: z.literal('used_before_changed') });
const changedUnderneath = (e: unknown): boolean =>
  e instanceof ApiError && changedBody.safeParse(e.body).success;

/** PATCH /subscriptions/:id/lessons-used-before, then the balances shown are read again. */
export function useEditUsedBefore({ subscriptionId, onSaved }: EditUsedBeforeOptions) {
  const queryClient = useQueryClient();
  const refetch = (keys: readonly (readonly unknown[])[]) =>
    Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  return useMutation({
    mutationFn: (n: number) => editUsedBefore(subscriptionId, n),
    onSuccess: async () => {
      await refetch(ALWAYS);
      onSaved();
    },
    onError: async (e) => {
      if (changedUnderneath(e)) await refetch([usedBeforeStateQuery(subscriptionId).queryKey]);
    },
  });
}
