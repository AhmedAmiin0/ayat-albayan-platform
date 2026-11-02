import type { CallView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { callListQuery } from '@/features/messaging/calls/api/calls-api';

/**
 * One chat's calls (docs/28 §5), for its log. Rendered only while calls are on, so nothing is asked
 * (and no query client is needed) while they are off.
 */
export function WithThreadCalls({ phone, children }: { phone: string; children: (calls: readonly CallView[] | undefined) => ReactNode }) {
  const calls = useQuery(callListQuery({ enabled: true, phone }));
  return children(calls.data);
}
