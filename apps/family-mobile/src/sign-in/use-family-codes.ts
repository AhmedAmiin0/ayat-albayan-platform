import { CODE_STATUS_KEY, CODE_STATUS_STALE_MS, codesOpen } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@ab/mobile-kit';

/**
 * Can a guardian get a WhatsApp code now (GET /auth/code/status `available`, docs/30 §4)? undefined
 * while it loads; a failed call reads as «no» and the code path stays hidden (docs/50 §6).
 */
export function useFamilyCodes(): boolean | undefined {
  const status = useQuery({
    queryKey: CODE_STATUS_KEY,
    queryFn: () => authApi.codeStatus(),
    retry: false,
    staleTime: CODE_STATUS_STALE_MS,
    meta: { noPersist: true },
  });
  return status.isPending ? undefined : codesOpen(status.data, 'family');
}
