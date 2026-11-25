import { useMutation, useQueryClient } from '@tanstack/react-query';
import { studentKeys, userKeys } from '@/features/people/keys';
import { setTestFlag } from './test-flag.api';

/** The flip of one switch; the family flips with it, so the users and students reads refresh. */
export function useSetTestFlag() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: setTestFlag,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: userKeys.all }),
        client.invalidateQueries({ queryKey: studentKeys.all }),
      ]);
    },
  });
}
