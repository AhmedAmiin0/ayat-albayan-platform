import { ActivityIndicator, ScrollView } from 'react-native';
import { useViewerTz, zoneNote } from '@/core/lib/clock';
import { t, useTheme, ErrorState } from '@ab/mobile-kit';
import { Note } from '@/more';
import { TeacherAttendanceTab } from './TeacherAttendanceTab';
import { TeacherScheduleTab } from './TeacherScheduleTab';
import { useTeacherOverview } from './teacher-overview-api';

export function TeacherOverviewTab({ teacherId, view }: { teacherId: string; view: 'schedule' | 'attendance' }) {
  const { color } = useTheme();
  const overview = useTeacherOverview(teacherId);
  const tz = useViewerTz();
  const data = overview.data;
  if (!data) {
    return overview.isError ? (
      <ErrorState message={t.sales.loadFailed} onRetry={() => void overview.refetch()} />
    ) : (
      <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
    );
  }
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingBottom: 24 }}>
      <Note>{zoneNote(tz)}</Note>
      {view === 'schedule' ? <TeacherScheduleTab weekly={data.weekly} /> : <TeacherAttendanceTab attendance={data.attendance} />}
    </ScrollView>
  );
}
