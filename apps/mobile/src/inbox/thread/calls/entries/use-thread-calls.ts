import type { CallView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { callListQuery } from '../api/calls-api';
import { useCallsEnabled } from '../state/call-context';

const NONE: readonly CallView[] = [];

/** One chat's calls for its list; nothing is asked while calls are off (or outside a staff tree). */
export function useThreadCalls(phone: string): readonly CallView[] {
  const enabled = useCallsEnabled();
  return useQuery(callListQuery({ enabled, phone })).data ?? NONE;
}
