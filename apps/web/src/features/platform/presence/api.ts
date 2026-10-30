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
import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http/api';

// Presence (docs/33): last seen from the API, online now from the socket (use-presence-watch).
const MINUTE_MS = 60_000;

/**
 * The chat header re-reads last seen this often: without a joined socket, «متصل الآن» rests on a
 * last seen under PRESENCE_RECENT_MS (2 min) old, so it must be fresher than that.
 */
const CHAT_PRESENCE_MS = 30_000;

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

/** The chat header's people with their last seen (the API writes it at most once a minute). */
export const channelPresenceQuery = ({ audience, studentId }: PresenceChat) =>
  queryOptions({
    queryKey: channelPresenceKey(audience, studentId),
    queryFn: () => apiFetch<ChannelPresence>(channelPresencePath(audience, studentId)),
    refetchInterval: CHAT_PRESENCE_MS,
  });

/** «حالة الفريق» (admin): every active staff login with its last seen. */
export const staffPresenceQuery = queryOptions({
  queryKey: staffPresenceKey,
  queryFn: () => apiFetch<StaffPresence>(STAFF_PRESENCE_PATH),
  refetchInterval: MINUTE_MS,
});
