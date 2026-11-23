import { channelPresenceKey, channelPresencePath, type ChannelAudience } from '@ab/client-core';
import { channelPresenceSchema } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch } from '#/lib/http/index.ts';

// The chat header's presence (docs/33): last seen from the API, online now from the socket
// (use-presence-watch).

/** A chat with a student: which of its people this viewer is told about. */
export interface PresenceChat {
  audience: ChannelAudience;
  studentId: string;
}

/**
 * The chat header's people; last seen moves at most once a minute (the API's throttle). Re-read on
 * each tick of the thread's one clock (`now` in the key, no timer of its own); the last answer
 * stays shown meanwhile.
 */
export const channelPresenceQuery = ({ audience, studentId }: PresenceChat, now: Date) =>
  queryOptions({
    queryKey: [...channelPresenceKey(audience, studentId), now.getTime()],
    queryFn: async () =>
      channelPresenceSchema.parse(await apiFetch(channelPresencePath(audience, studentId))),
    placeholderData: keepPreviousData,
  });
