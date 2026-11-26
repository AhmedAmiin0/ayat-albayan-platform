import { presenceLine } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useClock } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { channelPresenceQuery, type PresenceChat } from '@ab/web-kit/components/channel/presence/channel-presence-api';
import { bestPeer, withOnline } from '@ab/web-kit/components/channel/presence/presence-pick';
import { PresenceStatus } from '@ab/web-kit/components/channel/presence/PresenceStatus';
import { usePresenceWatch } from '@ab/web-kit/components/channel/presence/use-presence-watch';

interface Props {
  chat: PresenceChat;
  /** The zone the thread's times are shown in. */
  tz: string;
  /** The thread's one clock (useNow): the text and the re-read follow it, no timer here. */
  now: Date;
}

/** docs/33 §4: online if anyone visible is, else the newest last seen; nothing when off. */
export function ChannelPresenceLine({ chat, tz, now }: Props) {
  const { data } = useQuery(channelPresenceQuery(chat, now));
  const peers = data?.enabled === true ? data.peers : [];
  const watch = usePresenceWatch(peers.map((p) => p.profile_id));
  const clock = useClock();
  const best = bestPeer(withOnline(peers, { watch, now }));
  if (!best) return null;
  const at = { now, tz, ...clock, words: t.presence };
  const text = presenceLine({ ...at, online: best.online, lastSeenAt: best.last_seen_at });
  return <PresenceStatus online={best.online} text={text} />;
}
