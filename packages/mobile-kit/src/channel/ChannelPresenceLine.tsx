import { PresenceLabel } from '../ui/feedback/PresenceLabel';
import type { ChannelRef } from './channel-api';
import { useChannelPresence } from './use-channel-presence';

/** Under the channel's title: «متصل الآن» with the dot, or «آخر ظهور …»; else nothing. */
export function ChannelPresenceLine({ refs }: { refs: ChannelRef }) {
  const { online, text } = useChannelPresence(refs);
  if (!text) return null;
  return <PresenceLabel testID="channel-presence" text={text} online={online} />;
}
