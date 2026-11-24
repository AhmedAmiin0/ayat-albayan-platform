import { apiErrorCode } from '@ab/client-core';
import { STUDENT_STATUSES, type StudentStatus } from '@ab/catalog';
import { studentStatusStyle } from '@ab/money';
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
import { StatusSheets } from '@/students/course-card/StatusSheets';
import { useStatusPick } from '@/students/profile/use-status-pick';
import type { StudentRef } from '@ab/shared';

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

interface StatusChangerProps {
  student: StudentRef;
  /** The guardian's phone: the stop's done block opens the chat. */
  chatPhone?: string | undefined;
}

/** A failure restores the old status (R-MOB-03); a 409 status_changed writes nothing (R-STU-05). */
export function StatusChanger({ student, chatPhone }: StatusChangerProps) {
  const change = useOptimisticStatus<StudentStatus, StudentStatusChange>(STATUS);
  const [notice, setNotice] = useState<string | null>(null);
  const route = useStatusPick(student.id, (status) =>
    change.mutate({ id: student.id, status, expected: student.status }),
  );
  const set = (status: StudentStatus) => {
    if (change.isPending || route.waiting || status === student.status) return;
    setNotice(null);
    route.pick(status);
  };
  const done = (text: string) => {
    route.close();
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
      {route.line ? <Note>{route.line}</Note> : null}
      {change.isError ? (
        <ErrorLine
          message={statusChanged(change.error) ? t.students.statusChanged : t.common.error}
        />
      ) : null}
      <StatusSheets
        studentId={student.id}
        subscriptionId={route.stopping}
        chatPhone={chatPhone}
        ask={route.ask}
        onClose={route.close}
        onDone={done}
      />
    </View>
  );
}
