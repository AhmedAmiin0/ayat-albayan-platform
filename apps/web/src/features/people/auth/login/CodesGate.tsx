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

/**
 * family = `available` (the family flag too); staff = `staff` (teacher codes, staff reset: docs/46
 * A1).
 */
export type CodesSide = 'family' | 'staff';

const OPEN: Record<CodesSide, (s: { available: boolean; staff: boolean }) => boolean> = {
  family: (s) => s.available,
  staff: (s) => s.staff,
};

/** Can this side's codes be sent now? undefined while the status loads. */
export function useCodesOpen(side: CodesSide): boolean | undefined {
  const status = useQuery(codeStatusQuery);
  if (status.isPending) return undefined;
  return status.data ? OPEN[side](status.data) : false;
}

interface Props {
  side?: CodesSide;
  fallback: ReactNode;
  children: ReactNode;
}

/** Shows `children` only while that side's WhatsApp codes can be sent, `fallback` otherwise. */
export function CodesGate({ side = 'family', fallback, children }: Props) {
  const open = useCodesOpen(side);
  if (open === undefined) return <p className="text-sm text-ink-3">{t.common.loading}</p>;
  return <>{open ? children : fallback}</>;
}
