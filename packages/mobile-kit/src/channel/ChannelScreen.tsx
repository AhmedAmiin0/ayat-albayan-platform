import { router } from 'expo-router';
import { Screen } from '../ui/layout/Screen';
import { ScreenHeader } from '../ui/layout/ScreenHeader';
import { BackButton } from '../ui/navigation/BackButton';
import { ChannelPresenceLine } from './ChannelPresenceLine';
import { ChannelThread } from './ChannelThread';
import { useChannel, type ChannelRef } from './channel-api';

interface ChannelScreenProps {
  refs: ChannelRef;
  /** The header's title; each app names its own view of the channel. */
  title: string;
}

/**
 * A student channel screen (docs/31 §2), the same in both apps: the title with the student's name
 * under it, the presence line, then the thread. The app reads the student from its route.
 */
export function ChannelScreen({ refs, title }: ChannelScreenProps) {
  // The same query the thread reads (one request): it names the student.
  const name = useChannel(refs).data?.pages[0]?.student_name || undefined;
  return (
    <Screen chat>
      <ScreenHeader
        title={title}
        subtitle={name}
        leading={<BackButton onPress={() => router.back()} />}
      />
      <ChannelPresenceLine refs={refs} />
      <ChannelThread refs={refs} />
    </Screen>
  );
}
