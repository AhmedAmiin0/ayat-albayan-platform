import { useMutation, useQueryClient, type MutationFunction } from '@tanstack/react-query';
import { NUMBERS_QUERY_KEYS } from '@/lib/query-keys';
import { useNumbersNote } from './numbers-note';

export interface NumbersMutationOptions<T> {
  /** Runs with the answer once the lists refetched (close a dialog, empty a field). */
  onDone?: (data: T) => void;
  /** The toast on success (e.g. «حُفظت القيمة.»). */
  note?: string;
}

/**
 * A numbers write: on success the numbers and the parity refetch (any change to a number can open or
 * close a difference), then the toast and `onDone`.
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
      ]);
      if (options.note) onNote(options.note);
      options.onDone?.(data);
    },
  });
}
