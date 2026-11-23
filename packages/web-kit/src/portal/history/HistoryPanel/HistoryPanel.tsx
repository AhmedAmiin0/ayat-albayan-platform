import { historyMonths, historyRows } from '@ab/client-core';
import { dateText, type PortalHistoryStatus, type PortalStudent } from '@ab/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { EmptyState, QueryState } from '#/components/ui/display/index.ts';
import { Button } from '#/components/ui/form/index.ts';
import { t, locale } from '#/lib/i18n/index.ts';
import { portalHistoryQuery } from '#/portal/api.ts';
import type { OpenReport } from '#/portal/report/ReportView.tsx';
import { HistoryRow } from '#/portal/history/HistoryRow.tsx';

interface Props {
  student: PortalStudent;
  status: PortalHistoryStatus;
  onOpenReport: (report: OpenReport) => void;
  /** The family web's lesson page («ملفات الحلقة» on an attended row); staff pages have none. */
  onOpenLesson?: (lessonId: string) => void;
}

const EMPTY: Record<PortalHistoryStatus, () => [string, string]> = {
  attended: () => [t.portal.attendedEmpty, t.portal.attendedEmptyHint],
  absent: () => [t.portal.absentEmpty, t.portal.absentEmptyHint],
};

/** «أكتوبر 2026» of a «YYYY-MM» month (a calendar month, no zone). */
const monthName = (month: string): string =>
  dateText(new Date(`${month}-01T00:00:00Z`), { tz: 'UTC', locale }, { month: 'long', year: 'numeric' });

/** «حضرها» / «غاب عنها» (docs/50 §6): past lessons, newest first, by month, a page at a time. */
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
