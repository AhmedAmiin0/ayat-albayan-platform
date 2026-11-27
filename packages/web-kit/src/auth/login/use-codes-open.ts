import { CODE_STATUS_KEY, CODE_STATUS_STALE_MS, codesOpen, type CodesSide } from '@ab/client-core';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { authApi } from '@ab/web-kit/auth/login/auth-api';

/** GET /auth/code/status (docs/30 §4); a failed call counts as «not available». */
const codeStatusQuery = queryOptions({
  queryKey: CODE_STATUS_KEY,
  queryFn: () => authApi.codeStatus(),
  retry: false,
  staleTime: CODE_STATUS_STALE_MS,
});

/** Can this side's codes be sent now? undefined while the status loads. */
export function useCodesOpen(side: CodesSide): boolean | undefined {
  const status = useQuery(codeStatusQuery);
  if (status.isPending) return undefined;
  return codesOpen(status.data, side);
}
