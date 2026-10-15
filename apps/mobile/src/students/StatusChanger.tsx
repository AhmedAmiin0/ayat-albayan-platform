import { STUDENT_STATUSES, studentStatusStyle, type StudentStatus } from '@ab/shared';
import { View } from 'react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useOptimisticStatus, type StatusChange, type StatusRequest } from '@/lib/use-optimistic-status';
import { type, useTheme } from '@/theme';
import { FilterPills } from '@/ui/FilterPills';
import { SectionLabel } from './SectionLabel';
import type { StudentRef } from './types';
import { AppText } from '@/ui/AppText';

/** Students have no /status route: PATCH /students/:id, a compare-and-set on the status shown (R-STU-05). */
type StudentStatusChange = StatusChange<StudentStatus> & { expected: StudentStatus };
const request = (c: StudentStatusChange): StatusRequest => ({
  method: 'PATCH',
  path: `/students/${c.id}`,
  body: { status: c.status, expected_status: c.expected },
});
const STATUS = { path: '/students', request };

/** 409 `status_changed`: the status moved since the screen loaded it; the refetch shows the new one. */
const statusChanged = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 409 && (error.body as { code?: unknown } | null)?.code === 'status_changed';

const statusPills = () => STUDENT_STATUSES.map((s) => ({
  value: s,
  label: t.enums.studentStatus[s],
  ...studentStatusStyle[s],
}));

/**
 * One tap sets the status (PATCH /students/:id), shown at once everywhere it is cached; a failure
 * puts the old status back and says so here (R-MOB-03). If the status moved meanwhile (409
 * `status_changed`), nothing is written and the refetched current status is shown (R-STU-05).
 */
export function StatusChanger({ student }: { student: StudentRef }) {
  const { color } = useTheme();
  const change = useOptimisticStatus<StudentStatus, StudentStatusChange>(STATUS);
  const set = (status: StudentStatus) => {
    if (status !== student.status) change.mutate({ id: student.id, status, expected: student.status });
  };
  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>{t.students.status}</SectionLabel>
      <FilterPills
        items={statusPills()}
        value={student.status}
        onChange={set}
        accessibilityLabel={t.students.status}
        role="radiogroup"
      />
      {change.isError ? (
        <AppText
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{
            fontFamily: type.ui[500],
            fontSize: type.size.sm,
            lineHeight: type.lineHeight(type.size.sm),
            color: color.bad,
          }}
        >
          {statusChanged(change.error) ? t.students.statusChanged : t.common.error}
        </AppText>
      ) : null}
    </View>
  );
}
