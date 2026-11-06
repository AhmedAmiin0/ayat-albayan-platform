import { useMutation, useQueryClient, type MutationFunction } from '@tanstack/react-query';
import { NUMBERS_QUERY_KEYS } from '@/lib/settings/query-keys';
import { CATALOGUE_QUERY_KEY } from '@/features/messaging/notification-catalogue/catalogue-api';
import { useNumbersNote } from './numbers-note';

export interface NumbersMutationOptions<T> {
  /** Runs with the answer once the lists refetched (close a dialog, empty a field). */
  onDone?: (data: T) => void;
  /** The toast on success (e.g. «حُفظت القيمة.»). */
  note?: string;
  /** Runs when the write failed (drop an answer the page showed from an earlier press). */
  onFail?: () => void;
}

/**
 * A numbers write: on success the numbers, the parity (any change to a number can open or close a
 * difference) and «ماذا يُرسل ومتى» (in module mode a number decides whether its role can send) refetch,
 * then the toast and `onDone`. A refused write refetches the numbers and the parity too: the
 * refusal (e.g. parity_not_empty) means the page's copy is out of date, and a failed Evolution push
 * may have stored «غير متزامن» on the number (final review 4).
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
    onError: () => {
      options.onFail?.();
      void queryClient.invalidateQueries({ queryKey: NUMBERS_QUERY_KEYS.numbers });
      void queryClient.invalidateQueries({ queryKey: NUMBERS_QUERY_KEYS.parity });
    },
  });
}
