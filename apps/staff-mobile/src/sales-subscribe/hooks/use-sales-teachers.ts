import { salesSubscribeCalls } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { salesKeys } from '@/core/lib/keys';

const subscribe = salesSubscribeCalls({ apiFetch, apiSend });

/** Active teachers, names only. */
export function useSalesTeachers() {
  return useQuery({
    queryKey: salesKeys.teachers(),
    queryFn: () => subscribe.teachers(),
    staleTime: 5 * 60_000,
  });
}
