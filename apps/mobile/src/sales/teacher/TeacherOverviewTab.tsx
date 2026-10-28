import { ActivityIndicator, ScrollView, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { useTheme } from '@/theme';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { TeacherAttendanceTab } from './TeacherAttendanceTab';
import { TeacherScheduleTab } from './TeacherScheduleTab';
import { useTeacherOverview } from './teacher-overview-api';

/** «الجدول» or «الحضور» of a sales teacher's page (owner 2026-10-28): loading, error with retry, then the tab. */
export function TeacherOverviewTab({ teacherId, view }: { teacherId: string; view: 'schedule' | 'attendance' }) {
  const { color } = useTheme();
  const overview = useTeacherOverview(teacherId);
  const data = overview.data;
  if (!data) {
    return overview.isError ? (
      <ErrorState message={t.sales.loadFailed} onRetry={() => void overview.refetch()} />
    ) : (
      <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
    );
  }
  return (
    <ScrollView style={{ flex: 1, marginHorizontal: -16 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ gap: 4, paddingHorizontal: 16 }}>
        <Note>{t.schedule.riyadhTime}</Note>
      </View>
      {view === 'schedule' ? <TeacherScheduleTab weekly={data.weekly} /> : <TeacherAttendanceTab attendance={data.attendance} />}
    </ScrollView>
  );
}
