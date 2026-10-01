import { STUDENT_STATUSES, studentStatusStyle, type StudentStatus } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { useOptimisticStatus } from '@/lib/use-optimistic-status';
import { type, useTheme } from '@/theme';
import { FilterPills } from '@/ui/FilterPills';
import { SectionLabel } from './SectionLabel';
import type { StudentRef } from './types';
import { AppText } from '@/ui/AppText';

// Students have no /status route: status is a field of PATCH /students/:id.
const STATUS = { path: '/students', patchPath: (id: string) => `/students/${id}` };

const PILLS = STUDENT_STATUSES.map((s) => ({
  value: s,
  label: t.enums.studentStatus[s],
  ...studentStatusStyle[s],
}));

/**
 * One tap sets the status (PATCH /students/:id), shown at once everywhere it is cached; a failure
 * puts the old status back and says so here (R-MOB-03).
 */
export function StatusChanger({ student }: { student: StudentRef }) {
  const { color } = useTheme();
  const change = useOptimisticStatus<StudentStatus>(STATUS);
  const set = (status: StudentStatus) => {
    if (status !== student.status) change.mutate({ id: student.id, status });
  };
  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>{t.students.status}</SectionLabel>
      <FilterPills
        items={PILLS}
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
          {t.common.error}
        </AppText>
      ) : null}
    </View>
  );
}
