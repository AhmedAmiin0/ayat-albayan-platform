import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { UpcomingTimeOff } from '@/more/availability/UpcomingTimeOff';
import { WeeklyAvailability } from '@/more/availability/WeeklyAvailability';
import { BackButton } from '@/core/ui/navigation';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useTeacherMe } from '@/teacher/lib/queries';

/** My weekly availability and upcoming time-off, read-only (R-TCH-02): the admin edits them. */
export function MyAvailabilityScreen() {
  const me = useTeacherMe().data;
  const back = <BackButton onPress={() => router.back()} />;
  return (
    <Screen>
      <ScrollView
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 24, paddingHorizontal: 16, paddingBottom: 32 }}
      >
        <ScreenHeader title={t.availability.title} leading={back} />
        {me ? (
          <>
            <WeeklyAvailability teacher={me} />
            <UpcomingTimeOff teacherId={me.id} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
