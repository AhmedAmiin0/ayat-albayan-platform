import { guardianCalls } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';

const guardians = guardianCalls({ apiFetch, apiSend });

/** Only the second number; then the file, the families and the chats refetch. */
export function useRemoveSecondPhone(guardianId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (phone: string) => guardians.removePhone({ id: guardianId, phone }),
    onSuccess: () => {
      for (const key of [pathKey('/students'), pathKey('/guardians'), pathKey('/threads')]) {
        void client.invalidateQueries({ queryKey: key });
      }
    },
  });
}
