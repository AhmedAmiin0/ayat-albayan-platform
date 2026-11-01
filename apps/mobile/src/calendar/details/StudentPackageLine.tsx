import { DetailsLine } from './DetailsGroup';
import { packageName, usedOf } from '@/core/lib/money/format';
import { packageLine } from '@/payments/lib/package-line';
import { useRenewalThreshold, useStudentBalance } from '@/payments/hooks/queries';

/**
 * The admin's «باقة 8 حلقات · 3 من 8 حلقة · فاضل 5» under a student (R-SUB-01), from GET
 * /students/:id/balance (cached 5 minutes, the student file's read). Nothing while it loads or
 * for a student without a package (a trial). Only an admin's sheet mounts it: the endpoint is theirs.
 */
export function StudentPackageLine({ studentId }: { studentId: string }) {
  const balance = useStudentBalance(studentId).data;
  const line = packageLine(balance, useRenewalThreshold());
  const current = balance?.current;
  if (!line || !current) return null;
  return (
    <DetailsLine
      tone={line.alert ? 'bad' : 'ink2'}
    >{`${packageName(current)} · ${usedOf(current)} · ${line.label}`}</DetailsLine>
  );
}
