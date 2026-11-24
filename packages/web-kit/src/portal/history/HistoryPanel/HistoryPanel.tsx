import { historyMonths, historyRows } from '@ab/client-core';
import { dateText, type PortalHistoryStatus, type PortalStudent } from '@ab/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { portalHistoryQuery } from '@ab/web-kit/portal/api';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import type { OpenReport } from '@ab/web-kit/portal/report/ReportView';
import { HistoryRow } from '@ab/web-kit/portal/history/HistoryRow';

interface Props {
  student: PortalStudent;
  status: PortalHistoryStatus;
  onOpenReport: (report: OpenReport) => void;
  /** The family web's lesson page; staff pages have none. */
  onOpenLesson?: (lessonId: string) => void;
}

const EMPTY: Record<PortalHistoryStatus, () => [string, string]> = {
  attended: () => [t.portal.attendedEmpty, t.portal.attendedEmptyHint],
  absent: () => [t.portal.absentEmpty, t.portal.absentEmptyHint],
};

/** A calendar month, no zone. */
const monthName = (month: string): string =>
  dateText(new Date(`${month}-01T00:00:00Z`), { tz: 'UTC', locale }, { month: 'long', year: 'numeric' });

/** docs/50 §6: past lessons newest first, by month, a page at a time. */
export function HistoryPanel({ student, status, ...open }: Props) {
  const query = useInfiniteQuery(portalHistoryQuery({ studentId: student.id, status }));
  const [title, hint] = EMPTY[status]();
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
                    <HistoryRow
                      key={row.lesson_id}
                      row={row}
                      student={student}
                      {...open}
                    />
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
