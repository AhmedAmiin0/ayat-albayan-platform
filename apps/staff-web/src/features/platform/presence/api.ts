import {
  presenceSelfCall,
  presenceSelfKey,
  staffPresenceCall,
  staffPresenceKey,
} from '@ab/client-core';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';

// docs/33.
const MINUTE_MS = 60_000;
const client = { apiFetch, apiSend };

/** May this login track itself (presence_enabled)? Rarely changes: read once per ten minutes. */
export const presenceSelfQuery = queryOptions({
  queryKey: presenceSelfKey,
  queryFn: presenceSelfCall(client),
  staleTime: 10 * MINUTE_MS,
});

/** Admin only. */
export const staffPresenceQuery = queryOptions({
  queryKey: staffPresenceKey,
  queryFn: staffPresenceCall(client),
  refetchInterval: MINUTE_MS,
});
