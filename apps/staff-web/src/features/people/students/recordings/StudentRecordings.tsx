import type { UserRole } from '@ab/catalog';
import type { StudentRecordingFilters, StudentRecordingView } from '@ab/schedule';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Button,
  EmptyState,
  FormAlert,
  Pager,
  ListSkeleton,
  ApiError,
  t,
  teacherLabel,
} from '@ab/web-kit';
import { RecordingFiltersBar, type TeacherChoice } from './RecordingFiltersBar';
import { studentRecordingsQuery } from './recordings-api';
import { StudentRecordingRow } from './StudentRecordingRow';
import { teacherOptionsQuery } from '@/features/people/students/api';

const R = t.studentRecordings;

/** Teachers to filter by: all for an admin, else those on the loaded page plus the chosen one. */
function choices(items: StudentRecordingView[], all: TeacherChoice[]): TeacherChoice[] {
  const seen = new Map(all.map((x) => [x.id, x.name]));
  for (const i of items) if (i.teacher) seen.set(i.teacher.id, teacherLabel(i.teacher));
  return [...seen].map(([id, name]) => ({ id, name }));
}

/** `role` decides who may delete. */
export function StudentRecordings({ studentId, role }: { studentId: string; role: UserRole }) {
  const [filters, setFilters] = useState<StudentRecordingFilters>({});
  const [page, setPage] = useState(1);
  const list = useQuery(studentRecordingsQuery({ studentId, filters, page }));
  const teachers = useQuery({ ...teacherOptionsQuery, enabled: role === 'admin' });
  const all = (teachers.data ?? []).map((x) => ({ id: x.id, name: teacherLabel(x) }));
  const filtered = Object.values(filters).some(Boolean);
  const change = (next: StudentRecordingFilters) => {
    setFilters(next);
    setPage(1);
  };

  if (list.isError && list.error instanceof ApiError && list.error.status === 403) return null;
  return (
    <section aria-labelledby={`recordings-${studentId}`} className="mb-6 grid gap-2">
      <div>
        <h3 id={`recordings-${studentId}`} className="font-display text-h3 font-bold">{R.title}</h3>
        <p className="text-xs text-ink-3">{R.hint}</p>
      </div>
      <RecordingFiltersBar value={filters} onChange={change} teachers={choices(list.data?.items ?? [], all)} />
      {list.isPending && <ListSkeleton />}
      {list.isError && (
        <FormAlert>
          {R.error}{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void list.refetch()}>
            {R.retry}
          </Button>
        </FormAlert>
      )}
      {list.data?.total === 0 && <EmptyState title={filtered ? R.emptyFiltered : R.empty} />}
      {list.data && list.data.total > 0 && (
        <>
          <ul aria-label={R.title} className={list.isPlaceholderData ? 'opacity-60' : undefined}>
            {list.data.items.map((rec) => (
              <StudentRecordingRow key={rec.id} rec={rec} role={role} />
            ))}
          </ul>
          <Pager page={list.data.page} total={list.data.total} pageSize={list.data.pageSize} onPage={setPage} />
        </>
      )}
    </section>
  );
}
