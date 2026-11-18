import {
  PRESENCE_SELF_PATH,
  presenceSelfKey,
  STAFF_PRESENCE_PATH,
  staffPresenceKey,
} from '@ab/client-core';
import type { PresenceSelf, StaffPresence } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@ab/web-kit/lib/http/api';

// Presence (docs/33): the login's own switch and «حالة الفريق»; the chat header's line is in
// the kit (@ab/web-kit/components/channel/presence).
const MINUTE_MS = 60_000;

/** May this login track itself (presence_enabled)? Rarely changes: read once per ten minutes. */
export const presenceSelfQuery = queryOptions({
  queryKey: presenceSelfKey,
  queryFn: () => apiFetch<PresenceSelf>(PRESENCE_SELF_PATH),
  staleTime: 10 * MINUTE_MS,
});

/** «حالة الفريق» (admin): every active staff login with its last seen. */
export const staffPresenceQuery = queryOptions({
  queryKey: staffPresenceKey,
  queryFn: () => apiFetch<StaffPresence>(STAFF_PRESENCE_PATH),
  refetchInterval: MINUTE_MS,
});
