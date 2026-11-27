import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import type { Props } from './HistoryPanel.types';
import { HistoryMonths, noMonths } from './HistoryMonths';
import { MoreButton } from './MoreButton';
import { useHistoryPanel } from './use-history-panel';

/** docs/50 §6: past lessons newest first, by month, a page at a time. */
export function HistoryPanel({ student, status, ...open }: Props) {
  const { query, title, hint } = useHistoryPanel({ student, status });
  return (
    <QueryState
      query={query}
      isEmpty={noMonths}
      empty={<EmptyState title={title}>{hint}</EmptyState>}
    >
      {(months) => (
        <HistoryMonths
          months={months}
          student={student}
          more={<MoreButton query={query} />}
          {...open}
        />
      )}
    </QueryState>
  );
}
