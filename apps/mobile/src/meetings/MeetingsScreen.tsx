import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { t } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { useMeetings } from './api';
import { CreateMeeting } from './CreateMeeting';
import { MeetingRow } from './MeetingRow';

/**
 * «الاجتماعات الداخلية» (admin and teacher): create, then the newest 20 (all for an admin, else my
 * own) with enter, share link, end and recordings. The room itself opens in the system browser.
 */
export function MeetingsScreen() {
  const meetings = useMeetings();
  const back = <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />;
  let body = <AppText>{t.common.loading}</AppText>;
  if (meetings.isError && !meetings.data) body = <ErrorState onRetry={() => void meetings.refetch()} />;
  else if (meetings.data && meetings.data.length === 0) body = <EmptyState title={t.meetings.internal.empty} />;
  else if (meetings.data) body = <>{meetings.data.map((m) => <MeetingRow key={m.id} meeting={m} />)}</>;
  return (
    <Screen>
      <ScreenHeader title={t.mobileClassroom.meetingsRow} trailing={back} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ gap: 16 }}>
          <CreateMeeting />
          {body}
        </View>
      </ScrollView>
    </Screen>
  );
}
