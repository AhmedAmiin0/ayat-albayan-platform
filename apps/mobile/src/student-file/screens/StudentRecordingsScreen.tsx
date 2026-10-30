import type { StudentRecordingView } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { usePermissions } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { useStudentName } from '@/ops/reports/use-student-name';
import { useTeacherMe } from '@/teacher/lib/queries';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { isFiltered, NO_FILTERS, recordingParams, utcToday, type RecordingFilters } from '../recordings/recording-filters';
import { RecordingFiltersBar } from '../recordings/RecordingFiltersBar';
import { useRecordingRow } from '../recordings/RecordingRow';
import { useRecordings } from '../recordings/recordings-queries';
import { useTeacherChoices } from '../recordings/teacher-choices';
import { LazyList } from '@/core/ui/lists/LazyList';

const R = t.mobileStudentFile.recordings;
const keyOf = (r: StudentRecordingView) => r.id;

/**
 * «تسجيلات الحلقات» of one student (web: StudentRecordings), newest first, filtered on the server by
 * date and teacher. Admin from the student screen, teacher from their student's file (`admin` false:
 * their own tz and no delete). Controls follow recordings.manage; the API enforces the same. The list
 * screens' compact top (owner 2026-10-28): «تسجيلات الحلقات · 12» on the title's line, the student's name
 * under it, the rows in one inset card.
 */
export function StudentRecordingsScreen({ admin = true }: { admin?: boolean }) {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { color } = useTheme();
  const can = usePermissions();
  const me = useTeacherMe(!admin);
  const adminName = useStudentName(id, admin);
  const name = adminName ?? me.data?.students.find((s) => s.id === id)?.name;
  const [filters, setFilters] = useState<RecordingFilters>(NO_FILTERS);
  const params = recordingParams(filters, utcToday());
  const list = useRecordings(id, params);
  const teachers = useTeacherChoices(list.items, admin);
  const manage = can('recordings.manage');
  const renderItem = useRecordingRow({ studentId: id, manage, admin, freshUrl: list.freshUrl });
  const back = () => (router.canGoBack() ? router.back() : router.replace(admin ? `/students/${id}` : '/teacher/reports'));
  return (
    <Screen list>
      <ScreenHeader
        title={R.title}
        size="h2"
        connecting
        count={list.data ? list.total : undefined}
        subtitle={name}
        trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
      />
      {can('recordings.read') ? (
        <>
          <RecordingFiltersBar value={filters} onChange={setFilters} teachers={teachers} />
          {list.isError && list.data ? <Note>{R.error}</Note> : null}
          <LazyList
            paged={list}
            keyExtractor={keyOf}
            renderItem={renderItem}
            ListHeaderComponent={<Note>{R.hint}</Note>}
            ListFooterComponent={list.isFetchingNextPage ? <Note>{R.loadingMore}</Note> : null}
            ListEmptyComponent={
              list.data ? (
                <EmptyState title={isFiltered(filters) ? R.emptyFiltered : R.empty} />
              ) : list.isError ? (
                <ErrorState onRetry={list.refresh} message={R.error} />
              ) : (
                <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
              )
            }
          />
        </>
      ) : null}
    </Screen>
  );
}
