import { historyMonths, historyRows } from '@ab/client-core';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import { HistoryRow } from '@ab/web-kit/portal/history/HistoryRow';
import type { Props } from './HistoryPanel.types';
import { monthName } from './history-panel.helpers';
import { useHistoryPanel } from './use-history-panel';

/** docs/50 §6: past lessons newest first, by month, a page at a time. */
export function HistoryPanel({ student, status, ...open }: Props) {
  const { query, title, hint } = useHistoryPanel({ student, status });
  return (
    <QueryState query={query}>
      {({ pages }) => {
        const months = historyMonths(historyRows(pages, status), student.tz);
        if (months.length === 0) return <EmptyState title={title}>{hint}</EmptyState>;
        return (
          <div className="grid gap-5">
            {months.map(({ month, rows }) => (
              <section key={month} aria-label={monthName(month)} className="grid gap-2">
                <h3 className="text-sm font-semibold text-ink-2">{monthName(month)}</h3>
                <ul className="grid gap-3">
                  {rows.map((row) => (
                    <HistoryRow key={row.lesson_id} row={row} student={student} {...open} />
                  ))}
                </ul>
              </section>
            ))}
            {query.hasNextPage && (
              <Button
                type="button"
                variant="secondary"
                className="justify-self-center"
                disabled={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                {query.isFetchingNextPage ? t.portal.loadingMore : t.portal.more}
              </Button>
            )}
          </div>
        );
      }}
    </QueryState>
  );
}
