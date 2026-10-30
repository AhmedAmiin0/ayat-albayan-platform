import { presenceLine } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { t } from '@/lib/i18n/i18n';
import { channelPresenceQuery, type PresenceChat } from './api';
import { bestPeer, withOnline } from './presence-pick';
import { PresenceStatus } from './PresenceStatus';
import { usePresenceClock } from './use-presence-clock';
import { usePresenceWatch } from './use-presence-watch';

interface Props {
  chat: PresenceChat;
  /** The zone the thread's times are shown in. */
  tz: string;
}

/**
 * The student channel's header line (docs/33 §4): «متصل الآن» when anyone of the chat's people this
 * viewer may see is online, else the newest «آخر ظهور …»; nothing when presence is off or unknown.
 */
export function ChannelPresenceLine({ chat, tz }: Props) {
  const { data } = useQuery(channelPresenceQuery(chat));
  const peers = data?.enabled === true ? data.peers : [];
  const watch = usePresenceWatch(peers.map((p) => p.profile_id));
  const { now, ...clock } = usePresenceClock();
  const best = bestPeer(withOnline(peers, { watch, now }));
  if (!best) return null;
  const at = { now, tz, ...clock, words: t.presence };
  const text = presenceLine({ ...at, online: best.online, lastSeenAt: best.last_seen_at });
  return <PresenceStatus online={best.online} text={text} />;
}
