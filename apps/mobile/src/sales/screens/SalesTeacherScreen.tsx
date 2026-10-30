import { type SalesTeacherView, splitByStatus, studentStatusStyle, type StudentListKind } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, type ListRenderItemInfo } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { KIND_EMPTY } from '@/students/list/student-kinds';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { ListRow } from '@/core/ui/layout/ListRow';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { useSalesTeachers } from '../lib/sales-api';
import { SalesTeacherHeader } from '../components/SalesTeacherHeader';
import { nextLessonLine, teacherLabel, teacherSubtitle } from '../lib/sales-text';
import { useClockCycle } from '@/core/lib/clock';
import { studentDetailsHref, useTreeBase } from '@/core/nav/tree-base';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { TeacherOverviewTab } from '../teacher/TeacherOverviewTab';

type TeacherTab = 'students' | 'schedule' | 'attendance';
const TABS: readonly TeacherTab[] = ['students', 'schedule', 'attendance'];

/**
 * One teacher's page, switched «الطلاب · الجدول · الحضور» (owner 2026-10-28; default «الطلاب»). «الطلاب»
 * (the detail of «المعلمون», web drawer parity): name, code, program, status and the next lesson in Riyadh
 * time, switched «مشترك · تجريبي · الكل» (default «مشترك»), plus their day in the read-only schedule and the
 * teacher's fixed meeting link; a row opens the student's details in either tree (studentDetailsHref). «الجدول» / «الحضور»: TeacherOverviewTab.
 */
export function SalesTeacherScreen() {
  const cycle = useClockCycle();
  const { color } = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const list = useSalesTeachers();
  const [kind, setKind] = useState<StudentListKind>('active');
  const [tab, setTab] = useState<TeacherTab>('students');
  const base = useTreeBase();
  const teacher = list.data?.find((tc) => tc.id === id);
  const back = <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />;
  const rows = teacher ? splitByStatus(teacher.students, kind) : [];
  const row = useCallback(
    ({ item }: ListRenderItemInfo<SalesTeacherView['students'][number]>) => (
      <ListRow
        onPress={() => router.push(studentDetailsHref(base, item.id))}
        accessibilityHint={t.sales.allStudents.detailsHint}
        title={item.name}
        meta={item.code}
        subtitle={t.enums.program[item.program]}
        tags={<Note>{nextLessonLine(item, cycle)}</Note>}
        trailing={<StatusChip {...studentStatusStyle[item.status]} size="sm" label={t.enums.studentStatus[item.status]} />}
      />
    ),
    [base, cycle],
  );
  // The students sit in one inset card inside the gutter (owner 2026-10-28: one container rule).
  const cells = useInsetRows(row, rows.length);
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
      <FilterPills
        items={TABS.map((value) => ({ value, label: t.sales.teachers.tabs[value] }))}
        value={tab}
        onChange={setTab}
        accessibilityLabel={t.sales.teachers.tabsLabel}
      />
      {tab !== 'students' ? (
        <TeacherOverviewTab teacherId={teacher.id} view={tab} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          accessibilityLabel={t.sales.mobile.studentsOf.replace('{name}', name)}
          data={rows}
          ListHeaderComponent={<SalesTeacherHeader teacher={teacher} kind={kind} onKind={setKind} />}
          keyExtractor={(s) => s.id}
          extraData={cycle}
          {...cells}
          ListEmptyComponent={<EmptyState title={teacher.students.length === 0 ? t.sales.teachers.noStudents : KIND_EMPTY[kind]} />}
        />
      )}
    </Screen>
  );
}
