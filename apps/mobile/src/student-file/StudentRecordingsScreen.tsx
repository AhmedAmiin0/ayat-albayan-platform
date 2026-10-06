import { RIYADH_TZ } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { usePermissions } from '@/auth/use-permissions';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { useStudentName } from '@/ops/use-student-name';
import { useTeacherMe } from '@/teacher/queries';
import { useTheme } from '@/theme';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { isFiltered, NO_FILTERS, recordingParams, utcToday, type RecordingFilters } from './recording-filters';
import { RecordingFiltersBar } from './RecordingFiltersBar';
import { RecordingRow } from './RecordingRow';
import { useRecordings } from './recordings-queries';
import { useTeacherChoices } from './teacher-choices';

const R = t.mobileStudentFile.recordings;

/**
 * «تسجيلات الحلقات» of one student (web: StudentRecordings), newest first, filtered on the server by
 * date and teacher. Admin from the student screen, teacher from their student's file (`admin` false:
 * their own tz and no delete). Controls follow recordings.manage; the API enforces the same.
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
  const back = () => (router.canGoBack() ? router.back() : router.replace(admin ? `/students/${id}` : '/teacher/reports'));
  return (
    <Screen>
      <ScreenHeader
        title={R.title}
        subtitle={list.data ? R.count.replace('{n}', String(list.total)) : name}
        trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
      />
      {can('recordings.read') ? (
        <>
          <RecordingFiltersBar value={filters} onChange={setFilters} teachers={teachers} />
          {list.isError && list.data ? <Note>{R.error}</Note> : null}
          <FlatList
            style={{ flex: 1, marginHorizontal: -16 }}
            data={list.items}
            keyExtractor={(r) => r.id}
            renderItem={({ item }) => (
              <RecordingRow
                rec={item}
                studentId={id}
                tz={me.data?.tz ?? RIYADH_TZ}
                canManage={manage}
                canDelete={admin && manage && item.can_manage}
                getUrl={() => list.freshUrl(item.id)}
              />
            )}
            onEndReached={list.loadMore}
            refreshing={list.isRefetching && !list.isFetchingNextPage}
            onRefresh={list.refresh}
            ListHeaderComponent={<Note>{R.hint}</Note>}
            ListFooterComponent={list.isFetchingNextPage ? <Note>{R.loadingMore}</Note> : <View style={{ height: 24 }} />}
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
