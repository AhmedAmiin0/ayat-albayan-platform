import {
  MAINTENANCE_QUERY_KEY,
  maintenanceFacts,
  maintenancePollMs,
  maintenanceView,
  type MaintenanceState,
} from '@ab/client-core';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { usePathname } from 'expo-router';
import { audience, type Audience } from '../auth/audience';
import { useRootGate } from '../auth/root-gate';
import type { GateStatus } from '../auth/use-auth-gate';
import { phoneProbes } from './phone-probes';
import { useReopen } from './use-reopen';

/**
 * One request for the app, also while TanStack thinks it is offline (networkMode 'always': the
 * probe itself tells offline apart). Never persisted: yesterday's verdict must not cover a launch.
 */
export const maintenanceQuery = queryOptions({
  queryKey: MAINTENANCE_QUERY_KEY,
  queryFn: () => maintenanceFacts(phoneProbes),
  retry: false,
  staleTime: 0,
  networkMode: 'always',
  meta: { noPersist: true },
  refetchInterval: (query) => maintenancePollMs(query.state.data),
});

/** Who passes the switch: staff admins and the signed-out login (so an admin can get in). */
const PASSES: Record<Audience, readonly GateStatus[]> = {
  staff: ['admin', 'out', 'booting'],
  family: ['booting'],
};
/** The lesson room and its chat are never covered. */
const ROOM = /^\/room(-chat)?\//;

export function useMaintenance(): MaintenanceState {
  const facts = useQuery(maintenanceQuery);
  const gate = useRootGate();
  const inRoom = ROOM.test(usePathname());
  const bypass = PASSES[audience()].includes(gate);
  const view = maintenanceView(facts.data, { bypass, inRoom });
  useReopen(view !== 'open');
  return { view, checking: facts.isFetching, retry: () => void facts.refetch() };
}
