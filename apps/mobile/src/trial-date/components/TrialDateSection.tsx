import { canPickTrialDate } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { usePermissions } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import type { StudentProfile } from '@/students/types';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { useTrialHistory } from '../lib/queries';
import { studentFileTrialHref } from '../lib/trial-href';
import { TrialHistoryList } from './TrialHistoryList';

/**
 * The admin student file's «مواعيد الحلقة التجريبية» (R-STU-05): «موعد تجريبي جديد» while the
 * student has no running subscription (new / trial / pending_subscription), else the reason in
 * its place; then the history. Needs booking.write.
 */
export function TrialDateSection({ student }: { student: StudentProfile }) {
  const { color } = useTheme();
  const can = usePermissions();
  const allowed = can('booking.write');
  const history = useTrialHistory(student.id, allowed);
  if (!allowed) return null;
  const open = canPickTrialDate(student.status) && history.data?.allowed !== false;
  return (
    <View testID="trial-date-section" style={{ gap: 10 }}>
      {open ? (
        <Button
          variant="secondary"
          label={t.trialDate.action}
          accessibilityLabel={`${t.trialDate.action} — ${student.name}`}
          onPress={() => router.push(studentFileTrialHref({ studentId: student.id, name: student.name, program: student.program }))}
        />
      ) : (
        <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 }}>
          {t.trialDate.notAllowed}
        </AppText>
      )}
      <TrialHistoryList history={history.data} onRetry={history.isError ? () => void history.refetch() : undefined} />
    </View>
  );
}
