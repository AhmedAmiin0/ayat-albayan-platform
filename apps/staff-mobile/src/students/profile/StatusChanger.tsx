import { apiErrorCode, statusRoute } from '@ab/client-core';
import { STUDENT_STATUSES, studentStatusStyle, type StudentStatus } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ApiError, t, FilterPills, ErrorLine } from '@ab/mobile-kit';
import {
  useOptimisticStatus,
  type StatusChange,
  type StatusRequest,
} from '@/core/lib/query/use-optimistic-status';
import { Note } from '@/more';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { useActionKeys } from '@/students/course-actions/ActionButtons';
import { useCurrentSubscription } from '@/students/course-actions/course-actions-api';
import { StatusSheets, type StatusAsk } from '@/students/course-card/StatusSheets';
import type { StudentRef } from '@/students/shared/types';

/** No /status route: PATCH /students/:id, a compare-and-set on the status shown (R-STU-05). */
type StudentStatusChange = StatusChange<StudentStatus> & { expected: StudentStatus };
const request = (c: StudentStatusChange): StatusRequest => ({
  method: 'PATCH',
  path: `/students/${c.id}`,
  body: { status: c.status, expected_status: c.expected },
});
const STATUS = { path: '/students', request };

/** 409 `status_changed`: the status moved since the screen loaded it; the refetch shows it. */
const statusChanged = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 409 && apiErrorCode(error) === 'status_changed';

/** While a change saves the pills are off: a second tap would send a stale expected_status. */
const statusPills = (saving: boolean) => STUDENT_STATUSES.map((s) => ({
  value: s,
  label: t.enums.studentStatus[s],
  ...studentStatusStyle[s],
  disabled: saving,
}));

/**
 * One tap sets the status (PATCH /students/:id), shown at once everywhere it is cached; a failure
 * puts the old status back and says so here (R-MOB-03). If the status moved meanwhile (409
 * `status_changed`), nothing is written and the refetched current status is shown (R-STU-05).
 * «موقوف مؤقتًا» / «متوقف» open the pause / the stop of the current package instead (owner
 * 2026-11-17); without a package «متوقف» is set at once, as before.
 */
export function StatusChanger({ student }: { student: StudentRef }) {
  const change = useOptimisticStatus<StudentStatus, StudentStatusChange>(STATUS);
  const keys = useActionKeys();
  const sub = useCurrentSubscription({ studentId: student.id, given: undefined, keys });
  const [ask, setAsk] = useState<StatusAsk>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const set = (status: StudentStatus) => {
    if (change.isPending || status === student.status) return;
    const route = statusRoute(status);
    setNotice(null);
    if (route === 'set' || (route === 'stop' && sub === null)) {
      change.mutate({ id: student.id, status, expected: student.status });
      return;
    }
    setAsk(route);
  };
  const done = (text: string) => {
    setAsk(null);
    setNotice(text);
  };
  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>{t.students.status}</SectionLabel>
      <FilterPills
        items={statusPills(change.isPending)}
        value={student.status}
        onChange={set}
        accessibilityLabel={t.students.status}
        role="radiogroup"
      />
      <Note>{t.courseCard.statusNote}</Note>
      {notice ? <Note>{notice}</Note> : null}
      {change.isError ? (
        <ErrorLine
          message={statusChanged(change.error) ? t.students.statusChanged : t.common.error}
        />
      ) : null}
      <StatusSheets
        studentId={student.id}
        subscriptionId={sub}
        ask={ask}
        onClose={() => setAsk(null)}
        onDone={done}
      />
    </View>
  );
}
