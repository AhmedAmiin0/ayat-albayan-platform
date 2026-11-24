import {
  MAINTENANCE_QUERY_KEY,
  maintenanceFacts,
  maintenancePollMs,
  maintenanceView,
  type MaintenanceState,
} from '@ab/client-core';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import type { MaintenanceWatch } from './maintenance.types';
import { isRoomOpen, subscribeRoomPresence } from './room-presence';
import { useReopen } from './use-reopen';
import { useRoutePath } from './use-route-path';
import { useStaffPass } from './use-staff-pass';
import { webProbes } from './web-probes';

/** One request for the whole app: every 10 s while unknown, on or down; 60 s while healthy. */
export const maintenanceQuery = queryOptions({
  queryKey: MAINTENANCE_QUERY_KEY,
  queryFn: () => maintenanceFacts(webProbes),
  retry: false,
  staleTime: 0,
  refetchInterval: (query) => maintenancePollMs(query.state.data),
});

const matches = (pattern: RegExp | undefined, path: string): boolean =>
  pattern?.test(path) ?? false;

export function useMaintenance(watch: MaintenanceWatch): MaintenanceState {
  const { router, staff, rooms, signIn } = watch;
  const facts = useQuery(maintenanceQuery);
  const staffPass = useStaffPass();
  const path = useRoutePath(router);
  const roomOpen = useSyncExternalStore(subscribeRoomPresence, isRoomOpen);
  const bypass = (staff === true && staffPass) || matches(signIn, path);
  const inRoom = roomOpen || matches(rooms, path);
  const view = maintenanceView(facts.data, { bypass, inRoom });
  useReopen(view !== 'open', router);
  return { view, checking: facts.isFetching, retry: () => void facts.refetch() };
}
