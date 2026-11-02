import { channelPresenceKey, channelPresencePath } from '@ab/client-core';
import { presenceLine, type ChannelPresence, type PresencePeer } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { chatStatus, usePresenceClock, usePresenceWatch } from '@/core/lib/presence';
import { useScreenFocused } from '@/core/ui/connecting/use-screen-focus';
import type { ChannelRef } from './channel-queries';

/** Last seen moves by the minute at most (the API's throttle): re-read it once a minute. */
const PRESENCE_REFRESH_MS = 60_000;

const NO_PEERS: PresencePeer[] = [];

/** The answer's people, or none when presence is off or the answer is not one (an older API). */
const peersOf = (data: ChannelPresence | undefined): PresencePeer[] =>
  data?.enabled === true && Array.isArray(data.peers) ? data.peers : NO_PEERS;

/**
 * The chat header's status (docs/33 §1, §4): the chat's people this viewer may see, from the API,
 * watched live while the screen is focused and the app open. «متصل الآن» when any is online, else
 * «آخر ظهور …» of the newest; '' when presence is off, nobody is shown or nobody was ever seen.
 */
export function useChannelPresence({ audience, studentId }: ChannelRef) {
  const focused = useScreenFocused();
  const query = useQuery({
    queryKey: channelPresenceKey(audience, studentId),
    queryFn: () => apiFetch<ChannelPresence>(channelPresencePath(audience, studentId)),
    enabled: studentId !== '',
    refetchInterval: focused ? PRESENCE_REFRESH_MS : false,
  });
  const peers = peersOf(query.data);
  const watch = usePresenceWatch(
    peers.map((p) => p.profile_id),
    peers.length > 0,
  );
  const clock = usePresenceClock();
  const status = chatStatus(peers, { watch, now: clock.now });
  return { online: status.online, text: presenceLine({ ...clock, ...status }) };
}
