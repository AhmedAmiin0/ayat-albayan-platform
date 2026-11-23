import { useQuery } from '@tanstack/react-query';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import { earningsSummaryQuery } from '@/features/finance/payouts/api';
import { DuesBody } from './DuesBody';

/**
 * «مستحقات المعلمين» overview (ledger, all months): the total still owed, then per teacher what
 * they earned, were paid and are owed, with the oldest unpaid session; each row opens the
 * teacher's earnings page to pay.
 */
export function TeacherDuesSummary() {
  const summary = useQuery(earningsSummaryQuery());
  return (
    <QueryState query={summary} rows={2}>
      {(data) => <DuesBody summary={data} />}
    </QueryState>
  );
}
