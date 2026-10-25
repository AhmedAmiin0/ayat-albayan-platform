import { useMutation, useQueryClient, type MutationFunction } from '@tanstack/react-query';
import { NUMBERS_QUERY_KEYS } from '@/lib/settings/query-keys';
import { CATALOGUE_QUERY_KEY } from '../notification-catalogue/catalogue-api';
import { useNumbersNote } from './numbers-note';

export interface NumbersMutationOptions<T> {
  /** Runs with the answer once the lists refetched (close a dialog, empty a field). */
  onDone?: (data: T) => void;
  /** The toast on success (e.g. «حُفظت القيمة.»). */
  note?: string;
}

/**
 * A numbers write: on success the numbers, the parity (any change to a number can open or close a
 * difference) and «ماذا يُرسل ومتى» (in module mode a number decides whether its role can send) refetch,
 * then the toast and `onDone`. A refused write refetches the parity too: the refusal (e.g.
 * parity_not_empty) means the page's copy is out of date.
 */
export function useNumbersMutation<T, V>(mutationFn: MutationFunction<T, V>, options: NumbersMutationOptions<T> = {}) {
  const queryClient = useQueryClient();
  const onNote = useNumbersNote();
  return useMutation({
    mutationFn,
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: NUMBERS_QUERY_KEYS.numbers }),
        queryClient.invalidateQueries({ queryKey: NUMBERS_QUERY_KEYS.parity }),
        queryClient.invalidateQueries({ queryKey: CATALOGUE_QUERY_KEY }),
      ]);
      if (options.note) onNote(options.note);
      options.onDone?.(data);
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: NUMBERS_QUERY_KEYS.parity }),
  });
}
