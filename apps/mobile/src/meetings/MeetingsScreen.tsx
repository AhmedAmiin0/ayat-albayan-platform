import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { t } from '@/lib/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useMeetings } from './api';
import { CreateMeeting } from './CreateMeeting';
import { MeetingRow } from './MeetingRow';
import { useViewerTz } from './use-viewer-tz';

/**
 * «الاجتماعات الداخلية» (admin, teacher, assistant, sales): create now or scheduled with invitees,
 * then the newest (all for an admin, else mine and the ones I am invited to) with enter, share link,
 * reschedule, cancel, end and recordings. Times read in the viewer's zone; the room opens in the browser.
 */
export function MeetingsScreen() {
  const meetings = useMeetings();
  const tz = useViewerTz();
  const back = <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />;
  let body = <AppText>{t.common.loading}</AppText>;
  if (meetings.isError && !meetings.data) body = <ErrorState onRetry={() => void meetings.refetch()} />;
  else if (meetings.data && meetings.data.length === 0) body = <EmptyState title={t.meetings.internal.empty} />;
  else if (meetings.data) body = <>{meetings.data.map((m) => <MeetingRow key={m.id} meeting={m} tz={tz} />)}</>;
  return (
    <Screen>
      <ScreenHeader title={t.mobileClassroom.meetingsRow} trailing={back} />
      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ gap: 16 }}>
          <CreateMeeting />
          {body}
        </View>
      </ScrollView>
    </Screen>
  );
}
