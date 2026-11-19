import { useLocalSearchParams } from 'expo-router';
import { ChannelScreen, t } from '@ab/mobile-kit';
import { useDeviceChannelMedia } from '@ab/mobile-kit/channel/media';

/**
 * A child's chat with the teacher, `chat/[id]` and the room's `room-chat/[id]` (docs/50 §6, docs/31
 * §2): the shared channel screen on the family's routes, with the phone's media (the kit's device
 * port: a photo from the photos or the camera, a PDF, voice notes recorded and played in the app;
 * the API takes the family's uploads on its own route). Reached only from the child's «المحادثة»
 * pill, shown while family_chat_enabled is on; the API refuses the rest (403 family_chat_off),
 * which the thread shows as its load error.
 */
export function FamilyChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const refs = { audience: 'portal', studentId: id } as const;
  const media = useDeviceChannelMedia();
  return <ChannelScreen refs={refs} title={t.studentChannel.portalTab} media={media} />;
}
