import { queryOptions, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { t } from '@/lib/i18n/i18n';
import { authApi } from './auth-api';

/** GET /auth/code/status (docs/30 §4); a failed call counts as «not available». */
const codeStatusQuery = queryOptions({
  queryKey: ['auth', 'code-status'],
  queryFn: () => authApi.codeStatus(),
  retry: false,
  staleTime: 60_000,
});

/** Shows `children` only while WhatsApp codes can be sent, `fallback` otherwise. */
export function CodesGate({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const status = useQuery(codeStatusQuery);
  if (status.isPending) return <p className="text-sm text-ink-3">{t.common.loading}</p>;
  return <>{status.data?.available === true ? children : fallback}</>;
}
