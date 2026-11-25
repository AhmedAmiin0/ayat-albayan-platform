import {
  PRESENCE_SELF_PATH,
  presenceSelfKey,
  STAFF_PRESENCE_PATH,
  staffPresenceKey,
} from '@ab/client-core';
import type { PresenceSelf, StaffPresence } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@ab/web-kit';

// docs/33.
const MINUTE_MS = 60_000;

/** May this login track itself (presence_enabled)? Rarely changes: read once per ten minutes. */
export const presenceSelfQuery = queryOptions({
  queryKey: presenceSelfKey,
  queryFn: () => apiFetch<PresenceSelf>(PRESENCE_SELF_PATH),
  staleTime: 10 * MINUTE_MS,
});

/** Admin only. */
export const staffPresenceQuery = queryOptions({
  queryKey: staffPresenceKey,
  queryFn: () => apiFetch<StaffPresence>(STAFF_PRESENCE_PATH),
  refetchInterval: MINUTE_MS,
});
