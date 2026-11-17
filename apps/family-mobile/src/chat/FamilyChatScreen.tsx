import { useLocalSearchParams } from 'expo-router';
import { ChannelScreen, t } from '@ab/mobile-kit';

/**
 * A child's chat with the teacher, `chat/[id]` (docs/50 §6, docs/31 §2): the shared channel
 * screen on the family's routes. Reached only from the child's «المحادثة» pill, shown while
 * family_chat_enabled is on; the API refuses the rest (403 family_chat_off), which the thread
 * shows as its load error.
 */
export function FamilyChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const refs = { audience: 'portal', studentId: id } as const;
  return <ChannelScreen refs={refs} title={t.studentChannel.portalTab} />;
}
