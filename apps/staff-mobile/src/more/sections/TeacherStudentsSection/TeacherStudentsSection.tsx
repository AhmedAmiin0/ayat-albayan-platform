import { statusParamOfKind, type StudentListKind } from '@ab/shared';
import { useState } from 'react';
import { t, Button, ErrorState, FilterPills, InsetGroup, Section } from '@ab/mobile-kit';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { NO_FILTERS } from '@/students/list/student-filters';
import { KIND_EMPTY, kindCounts, kindPills, presetKind } from '@/students/list/student-kinds';
import { StudentRow } from '@/students/list/StudentRow';
import { useStatusCounts } from '@/students/list/use-student-list-data';
import { Note } from '@/core/ui/feedback/Note';
import type { StudentListItem } from '@ab/shared';

const L = t.studentLists;

interface TeacherStudentsSectionProps {
  teacherId: string;
  /** Absent opens on subscribed students. */
  status?: string;
}

/** The trial count is new, trial and pending_subscription; the web panel differs, undecided. */
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
      <FilterPills
        items={kindPills(kindCounts(counts.data))}
        value={kind}
        onChange={setKind}
        accessibilityLabel={L.kinds}
      />
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
