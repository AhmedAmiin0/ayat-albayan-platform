import { statusParamOfKind, type StudentListKind } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { NO_FILTERS } from '@/students/list/student-filters';
import { KIND_EMPTY, kindCounts, kindPills, presetKind } from '@/students/list/student-kinds';
import { StudentRow } from '@/students/list/StudentRow';
import type { StudentListItem } from '@/students/shared/types';
import { useStatusCounts } from '@/students/list/use-student-list-data';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { Note } from '@/core/ui/feedback/Note';
import { Section } from '@/core/ui/surface/Section';
import { InsetGroup } from '@/core/ui/surface/inset';

const L = t.studentLists;

interface TeacherStudentsSectionProps {
  teacherId: string;
  /** The `status` route param (a tapped count on «المعلمين»); none opens on «مشترك». */
  status?: string;
}

/**
 * «طلاب المعلم/ة» (owner 2026-10-12): «مشترك · تجريبي · الكل» with the API's counts (GET
 * /students/status-counts?teacher=; «تجريبي» = new + trial + pending_subscription), the list from GET /students?teacher=&status= («الكل» sends no
 * status: every status, paused and stopped too). A row opens the student's file. Not the web admin
 * panel's behaviour (TeacherStudentsPanel opens on trial + active with status chips): this opens on
 * «مشترك»; aligning them awaits an owner decision.
 */
export function TeacherStudentsSection({ teacherId, status }: TeacherStudentsSectionProps) {
  const [kind, setKind] = useState<StudentListKind>(() => presetKind(status));
  const counts = useStatusCounts({ ...NO_FILTERS, teacher: teacherId });
  const list = usePagedList<StudentListItem>({
    path: '/students',
    params: { teacher: teacherId, status: statusParamOfKind(kind) },
    pageSize: 50,
  });
  return (
    <Section title={L.section}>
      <FilterPills items={kindPills(kindCounts(counts.data))} value={kind} onChange={setKind} accessibilityLabel={L.kinds} />
      {list.data ? (
        list.items.length === 0 ? (
          <Note>{KIND_EMPTY[kind]}</Note>
        ) : (
          <InsetGroup>
            {list.items.map((s) => (
              <StudentRow key={s.id} student={s} />
            ))}
          </InsetGroup>
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
