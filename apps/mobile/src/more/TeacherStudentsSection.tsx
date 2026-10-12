import { statusParamOfKind, type StudentListKind } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { usePagedList } from '@/lib/use-paged-list';
import { countOf, NO_FILTERS, totalOf } from '@/students/student-filters';
import { KIND_EMPTY, kindPills, presetKind } from '@/students/student-kinds';
import { StudentRow } from '@/students/StudentRow';
import type { StudentListItem } from '@/students/types';
import { useStatusCounts } from '@/students/use-student-list-data';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import { FilterPills } from '@/ui/FilterPills';
import { Note } from './Note';
import { Section } from './Section';

const L = t.studentLists;

export interface TeacherStudentsSectionProps {
  teacherId: string;
  /** The `status` route param (a tapped count on «المعلمين»); none opens on «مشترك». */
  status?: string;
}

/**
 * «طلاب المعلم/ة» (web profile tab parity, owner 2026-10-12): «مشترك · تجريبي · الكل» with the API's
 * counts (GET /students/status-counts?teacher=), the list from GET /students?teacher=&status= («الكل»
 * sends no status: every status, paused and stopped too). A row opens the student's file.
 */
export function TeacherStudentsSection({ teacherId, status }: TeacherStudentsSectionProps) {
  const [kind, setKind] = useState<StudentListKind>(() => presetKind(status));
  const counts = useStatusCounts({ ...NO_FILTERS, teacher: teacherId });
  const list = usePagedList<StudentListItem>({
    path: '/students',
    params: { teacher: teacherId, status: statusParamOfKind(kind) },
    pageSize: 50,
  });
  const n = { active: countOf(counts.data, 'active'), trial: countOf(counts.data, 'trial'), all: totalOf(counts.data) };
  return (
    <Section title={L.section}>
      <FilterPills items={kindPills(n)} value={kind} onChange={setKind} accessibilityLabel={L.kinds} />
      {list.data ? (
        list.items.length === 0 ? (
          <Note>{KIND_EMPTY[kind]}</Note>
        ) : (
          <View style={{ marginHorizontal: -16 }}>
            {list.items.map((s) => (
              <StudentRow key={s.id} student={s} />
            ))}
          </View>
        )
      ) : list.isError ? (
        <ErrorState onRetry={list.refresh} />
      ) : (
        <Note>{t.common.loading}</Note>
      )}
      {list.hasNextPage ? (
        <Button variant="ghost" label={t.common.more} busy={list.isFetchingNextPage} onPress={list.loadMore} />
      ) : null}
    </Section>
  );
}
