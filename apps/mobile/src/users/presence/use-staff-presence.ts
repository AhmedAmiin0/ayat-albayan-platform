import { STAFF_PRESENCE_PATH, staffPresenceKey } from '@ab/client-core';
import type { StaffPresence, StaffPresenceRow } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useIsAdmin } from '@/auth';
import { apiFetch } from '@/core/lib/http/api';
import { usePresenceClock, usePresenceWatch } from '@/core/lib/presence';
import { useScreenFocused } from '@/core/ui/connecting/use-screen-focus';
import { staffOrder, watchOrder } from './staff-order';

/** Last seen moves by the minute at most (the API's throttle): re-read it once a minute. */
const STAFF_REFRESH_MS = 60_000;

const NO_STAFF: StaffPresenceRow[] = [];

type StaffState = 'hidden' | 'loading' | 'error' | 'off' | 'empty' | 'ready';

/** The answer's rows, or null when presence is off (or the answer is not one: an older API). */
const staffOf = (data: StaffPresence | undefined): StaffPresenceRow[] | null =>
  data?.enabled === true && Array.isArray(data.staff) ? data.staff : null;

function stateOf(admin: boolean, query: { data?: StaffPresence; isError: boolean }): StaffState {
  if (!admin) return 'hidden';
  if (!query.data) return query.isError ? 'error' : 'loading';
  const staff = staffOf(query.data);
  if (!staff) return 'off';
  return staff.length === 0 ? 'empty' : 'ready';
}

/**
 * «حالة الفريق» (docs/33 §2, admin only): every staff login's last seen from the API, re-read every
 * minute while shown, and who is online now over the socket (at most PRESENCE_WATCH_MAX watched).
 */
export function useStaffPresence() {
  const admin = useIsAdmin();
  const focused = useScreenFocused();
  const query = useQuery({
    queryKey: staffPresenceKey,
    queryFn: () => apiFetch<StaffPresence>(STAFF_PRESENCE_PATH),
    enabled: admin,
    refetchInterval: admin && focused ? STAFF_REFRESH_MS : false,
  });
  const staff = staffOf(query.data) ?? NO_STAFF;
  const watch = usePresenceWatch(watchOrder(staff), staff.length > 0);
  const clock = usePresenceClock();
  const lines = staffOrder(staff, { watch, now: clock.now });
  return {
    state: stateOf(admin, query),
    lines,
    onlineCount: lines.filter((l) => l.online).length,
    clock,
    retry: () => void query.refetch(),
  };
}
