import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import {
  t,
  AppText,
  BackButton,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
} from '@ab/mobile-kit';
import { useMeetings } from '@/meetings/manage/api';
import { CreateMeeting, type MeetingAllow } from '@/meetings/create/CreateMeeting';
import { MeetingRow } from '@/meetings/manage/MeetingRow';
import { useViewerTz } from '@/core/lib/clock';

/** Admins see all, others own and invited; times in the viewer's zone; `allow` gates starts. */
export function MeetingsScreen({ allow }: { allow?: MeetingAllow }) {
  const meetings = useMeetings();
  const tz = useViewerTz();
  const back = <BackButton onPress={() => router.back()} />;
  let body = <AppText>{t.common.loading}</AppText>;
  if (meetings.isError && !meetings.data) body = <ErrorState onRetry={() => void meetings.refetch()} />;
  else if (meetings.data?.length === 0) body = <EmptyState title={t.meetings.internal.empty} />;
  else if (meetings.data) body = <>{meetings.data.map((m) => <MeetingRow key={m.id} meeting={m} tz={tz} />)}</>;
  return (
    <Screen>
      <ScreenHeader title={t.mobileClassroom.meetingsRow} leading={back} />
      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ gap: 16 }}>
          <CreateMeeting allow={allow} />
          {body}
        </View>
      </ScrollView>
    </Screen>
  );
}
