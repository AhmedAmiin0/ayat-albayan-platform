import { View } from 'react-native';
import { PresenceLabel } from '@/core/ui/feedback/PresenceLabel';
import type { ChannelRef } from './channel-queries';
import { useChannelPresence } from './use-channel-presence';

/** Under the channel's title: «متصل الآن» with the dot, or «آخر ظهور …»; else nothing. */
export function ChannelPresenceLine({ refs }: { refs: ChannelRef }) {
  const { online, text } = useChannelPresence(refs);
  if (!text) return null;
  return (
    <View style={{ marginTop: -4, paddingBottom: 4 }}>
      <PresenceLabel testID="channel-presence" text={text} online={online} />
    </View>
  );
}
