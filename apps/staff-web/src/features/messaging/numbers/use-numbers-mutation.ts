import { useMutation, useQueryClient, type MutationFunction } from '@tanstack/react-query';
import { NUMBERS_QUERY_KEYS } from '@/lib/settings/query-keys';
import { catalogueKeys } from '@/features/messaging/keys';
import { useNumbersNote } from './numbers-note';

export interface NumbersMutationOptions<T> {
  /** Runs with the answer once the lists refetched (close a dialog, empty a field). */
  onDone?: (data: T) => void;
  note?: string;
  /** Runs when the write failed (drop an answer the page showed from an earlier press). */
  onFail?: () => void;
}

/** A refused write also refetches, since the page's copy is out of date (final review 4). */
export function useNumbersMutation<T, V>(
  mutationFn: MutationFunction<T, V>,
  options: NumbersMutationOptions<T> = {},
) {
  const queryClient = useQueryClient();
  const onNote = useNumbersNote();
  return useMutation({
    mutationFn,
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: NUMBERS_QUERY_KEYS.numbers }),
        queryClient.invalidateQueries({ queryKey: NUMBERS_QUERY_KEYS.parity }),
        queryClient.invalidateQueries({ queryKey: catalogueKeys.all }),
      ]);
      if (options.note) onNote(options.note);
      options.onDone?.(data);
    },
    onError: () => {
      options.onFail?.();
      void queryClient.invalidateQueries({ queryKey: NUMBERS_QUERY_KEYS.numbers });
      void queryClient.invalidateQueries({ queryKey: NUMBERS_QUERY_KEYS.parity });
    },
  });
}
