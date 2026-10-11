import { studentStatusStyle } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { useTheme } from '@/theme';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { StatusChip } from '@/ui/StatusChip';
import { useSalesTeachers } from './sales-api';
import { nextLessonLine, teacherCounts, teacherLabel, teacherSubtitle } from './sales-text';

/**
 * One teacher's students (the detail of «المعلمون», web drawer parity): name, code, program, status
 * (trial included) and the next lesson in Riyadh time, plus their day in the read-only schedule.
 */
export function SalesTeacherScreen() {
  const { color } = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const list = useSalesTeachers();
  const teacher = list.data?.find((tc) => tc.id === id);
  const back = <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />;
  if (!teacher) {
    return (
      <Screen>
        <ScreenHeader title={t.sales.teachers.title} trailing={back} />
        {list.isError ? (
          <ErrorState message={t.sales.loadFailed} onRetry={() => void list.refetch()} />
        ) : list.data ? (
          <EmptyState title={t.common.notFound} />
        ) : (
          <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
        )}
      </Screen>
    );
  }
  const name = teacherLabel(teacher);
  return (
    <Screen>
      <ScreenHeader title={t.sales.teachers.detailTitle.replace('{name}', name)} subtitle={teacherSubtitle(teacher)} trailing={back} />
      <View style={{ gap: 8, paddingBottom: 8, alignItems: 'flex-start' }}>
        <Note>{teacherCounts(teacher)}</Note>
        {teacher.live_now ? <StatusChip tone="ok" glyph="fill" size="sm" label={t.sales.teachers.liveNow} /> : null}
        <Button
          variant="secondary"
          label={t.sales.teachers.openSchedule}
          onPress={() => router.push({ pathname: '/more/sales/schedule', params: { teacherId: teacher.id } })}
        />
        <Note>{t.schedule.riyadhTime}</Note>
      </View>
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        accessibilityLabel={t.sales.mobile.studentsOf.replace('{name}', name)}
        data={teacher.students}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <ListRow
            title={item.name}
            meta={item.code}
            subtitle={t.enums.program[item.program]}
            tags={<Note>{nextLessonLine(item)}</Note>}
            trailing={<StatusChip {...studentStatusStyle[item.status]} size="sm" label={t.enums.studentStatus[item.status]} />}
          />
        )}
        ListEmptyComponent={<EmptyState title={t.sales.teachers.noStudents} />}
      />
    </Screen>
  );
}
