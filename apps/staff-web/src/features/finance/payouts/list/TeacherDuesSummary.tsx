import { useQuery } from '@tanstack/react-query';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import { earningsSummaryQuery } from '@/features/finance/payouts/api';
import { DuesBody } from './DuesBody';

/** From the ledger across all months. */
export function TeacherDuesSummary() {
  const summary = useQuery(earningsSummaryQuery());
  return (
    <QueryState query={summary} rows={2}>
      {(data) => <DuesBody summary={data} />}
    </QueryState>
  );
}
