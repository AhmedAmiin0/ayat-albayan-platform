import { apiErrorCode, statusRoute, type StatusRoute } from '@ab/client-core';
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
import { useCurrentPackage } from '@/students/course-actions/course-actions-api';
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

/** «متوقف» while the package is read: «جارٍ التحميل», or the error when it cannot be read. */
type StopRead = 'idle' | 'waiting' | 'failed';
const STOP_READ_LINE: Record<Exclude<StopRead, 'idle'>, () => string> = {
  waiting: () => t.common.loading,
  failed: () => t.common.error,
};

/**
 * One tap sets the status (PATCH /students/:id), shown at once everywhere it is cached; a failure
 * puts the old status back and says so here (R-MOB-03). If the status moved meanwhile (409
 * `status_changed`), nothing is written and the refetched current status is shown (R-STU-05).
 * «موقوف مؤقتًا» / «متوقف» open the pause / the stop of the current package instead (owner
 * 2026-11-17); without a package «متوقف» is set at once, as before. While the package is not
 * known yet «متوقف» waits for it (never mistaken for «no package»); a failed read says so.
 */
export function StatusChanger({ student }: { student: StudentRef }) {
  const change = useOptimisticStatus<StudentStatus, StudentStatusChange>(STATUS);
  const keys = useActionKeys();
  const sub = useCurrentPackage({ studentId: student.id, given: undefined, keys });
  const [ask, setAsk] = useState<StatusAsk>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [read, setRead] = useState<StopRead>('idle');
  const setNow = (status: StudentStatus) =>
    change.mutate({ id: student.id, status, expected: student.status });
  const stop = async () => {
    setRead('waiting');
    const id = sub.id === undefined ? await sub.settle() : sub.id;
    setRead(id === undefined ? 'failed' : 'idle');
    if (id) setAsk('stop');
    if (id === null) setNow('churned');
  };
  const routes: Record<StatusRoute, (status: StudentStatus) => void> = {
    set: setNow,
    pause: () => setAsk('pause'),
    stop: () => void stop(),
  };
  const set = (status: StudentStatus) => {
    if (change.isPending || read === 'waiting' || status === student.status) return;
    setNotice(null);
    setRead('idle');
    routes[statusRoute(status)](status);
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
      {read === 'idle' ? null : <Note>{STOP_READ_LINE[read]()}</Note>}
      {change.isError ? (
        <ErrorLine
          message={statusChanged(change.error) ? t.students.statusChanged : t.common.error}
        />
      ) : null}
      <StatusSheets
        studentId={student.id}
        subscriptionId={sub.id ?? null}
        ask={ask}
        onClose={() => setAsk(null)}
        onDone={done}
      />
    </View>
  );
}
