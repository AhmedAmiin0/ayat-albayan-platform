import {
  channelPresenceKey,
  channelPresencePath,
  PRESENCE_SELF_PATH,
  presenceSelfKey,
  STAFF_PRESENCE_PATH,
  staffPresenceKey,
  type ChannelAudience,
} from '@ab/client-core';
import type { ChannelPresence, PresenceSelf, StaffPresence } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http/api';

// Presence (docs/33): last seen from the API, online now from the socket (use-presence-watch).
const MINUTE_MS = 60_000;

/** A chat with a student: which of its people this viewer is told about. */
export interface PresenceChat {
  audience: ChannelAudience;
  studentId: string;
}

/** May this login track itself (presence_enabled)? Rarely changes: read once per ten minutes. */
export const presenceSelfQuery = queryOptions({
  queryKey: presenceSelfKey,
  queryFn: () => apiFetch<PresenceSelf>(PRESENCE_SELF_PATH),
  staleTime: 10 * MINUTE_MS,
});

/**
 * The chat header's people; last seen moves at most once a minute (the API's throttle). Re-read on
 * each tick of the thread's one clock (`now` in the key, no timer of its own); the last answer
 * stays shown meanwhile.
 */
export const channelPresenceQuery = ({ audience, studentId }: PresenceChat, now: Date) =>
  queryOptions({
    queryKey: [...channelPresenceKey(audience, studentId), now.getTime()],
    queryFn: () => apiFetch<ChannelPresence>(channelPresencePath(audience, studentId)),
    placeholderData: keepPreviousData,
  });

/** «حالة الفريق» (admin): every active staff login with its last seen. */
export const staffPresenceQuery = queryOptions({
  queryKey: staffPresenceKey,
  queryFn: () => apiFetch<StaffPresence>(STAFF_PRESENCE_PATH),
  refetchInterval: MINUTE_MS,
});
