import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { t, BackButton, Screen, ScreenHeader } from '@ab/mobile-kit';
import type { RecordingSource } from './recording-format';
import { RecordingsList } from './RecordingsList';

export function RecordingsScreen({ source }: { source: RecordingSource }) {
  const title = source.kind === 'meeting' ? t.mobileClassroom.recordingsOfMeeting : t.mobileClassroom.recordingsOf;
  const back = <BackButton onPress={() => router.back()} />;
  return (
    <Screen>
      <ScreenHeader title={title} leading={back} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        <RecordingsList source={source} />
      </ScrollView>
    </Screen>
  );
}
