import { canPickTrialDate } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { usePermissions, t, type, useTheme, AppText, Button } from '@ab/mobile-kit';
import { useStudentHref } from '@/core/nav/tree-base';
import { useTrialHistory } from '@/trial-date/lib/queries';
import { studentFileTrialHref } from '@/trial-date/lib/trial-href';
import { TrialHistoryList } from './TrialHistoryList';
import type { StudentProfile } from '@ab/shared';

/** Only while no running subscription (R-STU-05), else the reason; needs booking.write. */
export function TrialDateSection({ student }: { student: StudentProfile }) {
  const { color } = useTheme();
  const can = usePermissions();
  const allowed = can('booking.write');
  const history = useTrialHistory(student.id, allowed);
  const to = useStudentHref();
  if (!allowed) return null;
  const open = canPickTrialDate(student.status) && history.data?.allowed !== false;
  return (
    <View testID="trial-date-section" style={{ gap: 10 }}>
      {open ? (
        <Button
          variant="secondary"
          label={t.trialDate.action}
          accessibilityLabel={`${t.trialDate.action} — ${student.name}`}
          onPress={() =>
            router.push(
              to(
                studentFileTrialHref({
                  studentId: student.id,
                  name: student.name,
                  program: student.program,
                }),
              ),
            )
          }
        />
      ) : (
        <AppText
          style={{
            fontFamily: type.ui[500],
            fontSize: type.size.sm,
            lineHeight: type.lineHeight(type.size.sm),
            color: color.ink2,
          }}
        >
          {t.trialDate.notAllowed}
        </AppText>
      )}
      <TrialHistoryList
        history={history.data}
        onRetry={history.isError ? () => void history.refetch() : undefined}
      />
    </View>
  );
}
