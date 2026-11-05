import { useMutation, useQueryClient } from '@tanstack/react-query';
import { editStartDate, MONEY_KEY } from '@/features/finance/subscriptions/api';

export interface EditStartDateOptions {
  subscriptionId: string;
  onSaved: () => void;
}

// Every view showing the package's day or its balance: the admin's money and profile, the
// assistant's sales views (the subscription history included).
const STALE: readonly (readonly unknown[])[] = [MONEY_KEY, ['students'], ['sales']];

/** PATCH /subscriptions/:id/start-date, then the views holding the package are read again. */
export function useEditStartDate({ subscriptionId, onSaved }: EditStartDateOptions) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (startsOn: string) => editStartDate(subscriptionId, startsOn),
    onSuccess: async () => {
      await Promise.all(STALE.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      onSaved();
    },
  });
}
