import { DetailsLine } from './DetailsGroup';
import { packageName, usedOf } from '@/core/lib/money/format';
import { packageLine } from '@/payments/lib/package-line';
import { useRenewalThreshold, useStudentBalance } from '@/payments/hooks/queries';

/** R-SUB-01: cached 5 minutes; only an admin's sheet mounts it since the endpoint is theirs. */
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
