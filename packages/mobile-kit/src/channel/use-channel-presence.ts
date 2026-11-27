import { channelPresenceKey } from '@ab/client-core';
import { presenceLine, type ChannelPresence, type PresencePeer } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { chatStatus } from '../lib/presence/presence-peers';
import { usePresenceClock } from '../lib/presence/use-presence-clock';
import { usePresenceWatch } from '../lib/presence/use-presence-watch';
import { useScreenFocused } from '../ui/connecting/use-screen-focus';
import { channelCalls, type ChannelRef } from './channel-api';

/** Last seen moves by the minute at most (the API's throttle): re-read it once a minute. */
const PRESENCE_REFRESH_MS = 60_000;

const NO_PEERS: PresencePeer[] = [];

/** The answer's people, or none while presence is off or the answer is not in yet. */
const peersOf = (data: ChannelPresence | undefined): PresencePeer[] =>
  data?.enabled === true ? data.peers : NO_PEERS;

/** docs/33 §1, §4: live while focused and foreground; empty when presence is off or unseen. */
export function useChannelPresence({ audience, studentId }: ChannelRef) {
  const focused = useScreenFocused();
  const query = useQuery({
    queryKey: channelPresenceKey(audience, studentId),
    queryFn: () => channelCalls[audience].presence(studentId),
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
