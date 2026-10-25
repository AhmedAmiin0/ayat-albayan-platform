import { splitByStatus, studentStatusStyle, type StudentListKind } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { KIND_EMPTY } from '@/students/student-kinds';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { ListRow } from '@/core/ui/layout/ListRow';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { useSalesTeachers } from './sales-api';
import { SalesTeacherHeader } from './SalesTeacherHeader';
import { nextLessonLine, teacherLabel, teacherSubtitle } from './sales-text';

/**
 * One teacher's students (the detail of «المعلمون», web drawer parity): name, code, program, status
 * and the next lesson in Riyadh time, switched «مشترك · تجريبي · الكل» (default «مشترك»), plus their
 * day in the read-only schedule and the teacher's fixed meeting link.
 */
export function SalesTeacherScreen() {
  const { color } = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const list = useSalesTeachers();
  const [kind, setKind] = useState<StudentListKind>('active');
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
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        accessibilityLabel={t.sales.mobile.studentsOf.replace('{name}', name)}
        data={splitByStatus(teacher.students, kind)}
        ListHeaderComponent={<SalesTeacherHeader teacher={teacher} kind={kind} onKind={setKind} />}
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
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 16 }}>
            <EmptyState title={teacher.students.length === 0 ? t.sales.teachers.noStudents : KIND_EMPTY[kind]} />
          </View>
        }
      />
    </Screen>
  );
}
