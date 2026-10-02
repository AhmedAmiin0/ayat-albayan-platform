import { packageLine } from '@/payments/package-line';
import { useRenewalThreshold, useStudentBalance } from '@/payments/queries';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';

/**
 * The package line under a student on a Today card (docs/07 §12): «فاضل حلقتين», saffron only
 * while the renewal alert is due. GET /lessons/day has no balance yet, so each student's
 * GET /students/:id/balance is asked once and cached (queries.ts). Nothing without a package or
 * while the balance is unknown.
 */
export function PackageLine({ studentId }: { studentId: string }) {
  const { color } = useTheme();
  const { data } = useStudentBalance(studentId);
  const line = packageLine(data, useRenewalThreshold());
  if (!line) return null;
  return (
    <AppText
      numberOfLines={1}
      style={{
        fontFamily: type.ui[line.alert ? 600 : 500],
        fontSize: type.size.xs,
        lineHeight: type.lineHeight(type.size.xs),
        color: line.alert ? color.act : color.ink2,
        fontVariant: ['tabular-nums'],
      }}
    >
      {line.label}
    </AppText>
  );
}
