import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { BackButton } from '@/core/ui/navigation';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import type { RecordingSource } from './recording-format';
import { RecordingsList } from './RecordingsList';

/** «التسجيلات» of one lesson or meeting as a screen of its own (the route passes the source). */
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
