import { ChannelScreen, t } from '@ab/mobile-kit';
import { useFamilyChatScreen } from './use-family-chat-screen';

/** Shown only while family_chat_enabled is on; the API refuses the rest (403 family_chat_off). */
export function FamilyChatScreen() {
  const { refs, media } = useFamilyChatScreen();
  return <ChannelScreen refs={refs} title={t.studentChannel.portalTab} media={media} />;
}
