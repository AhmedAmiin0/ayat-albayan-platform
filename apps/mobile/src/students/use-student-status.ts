import type { StudentStatus } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/lib/api';
import { patchCached } from '@/lib/paging';
import type { StatusChange } from '@/lib/use-optimistic-status';

const queryKey = ['students'];

/**
 * useOptimisticStatus for students (R-MOB-03). Students have no /status route: status is a field of
 * PATCH /students/:id. Every cached list page and detail flips at once, rolls back on error, and
 * ['students'] refetches either way. ponytail: delete once useOptimisticStatus takes the URL.
 */
export function useStudentStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: StatusChange<StudentStatus>) =>
      apiSend<unknown>('PATCH', `/students/${id}`, { status }),
    onMutate: async (change) => {
      await client.cancelQueries({ queryKey });
      const snapshot = client.getQueriesData({ queryKey });
      client.setQueriesData({ queryKey }, (old: unknown) => patchCached(old, { ...change }));
      return { snapshot };
    },
    onError: (_error, _change, context) => {
      context?.snapshot.forEach(([key, data]) => client.setQueryData(key, data));
    },
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
}
