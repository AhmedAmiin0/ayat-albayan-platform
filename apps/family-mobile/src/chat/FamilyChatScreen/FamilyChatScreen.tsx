import { useLocalSearchParams } from 'expo-router';
import { ChannelScreen, t } from '@ab/mobile-kit';
import { useDeviceChannelMedia } from '@ab/mobile-kit/channel/media';

/** Shown only while family_chat_enabled is on; the API refuses the rest (403 family_chat_off). */
export function FamilyChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const refs = { audience: 'portal', studentId: id } as const;
  const media = useDeviceChannelMedia();
  return <ChannelScreen refs={refs} title={t.studentChannel.portalTab} media={media} />;
}
