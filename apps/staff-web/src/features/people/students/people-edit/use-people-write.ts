import { useMutation, useQueryClient } from '@tanstack/react-query';
import { peopleErrorText, refreshPeople } from './api';

/**
 * One /people write: refetches every query after it (lists, profiles, chats, money) and turns a
 * refusal into its MSA sentence. `onDone` gets the success notice.
 */
export function usePeopleWrite<I, R>(write: (input: I) => Promise<R>, onDone: (result: R) => void) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: write,
    onSuccess: async (result) => {
      onDone(result);
      await refreshPeople(client);
    },
  });
  const error = mutation.isError ? peopleErrorText(mutation.error) : null;
  return { ...mutation, errorText: error };
}
