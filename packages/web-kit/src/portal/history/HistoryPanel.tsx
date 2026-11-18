import { historyMonths, historyRows } from '@ab/client-core';
import { dateText, type PortalHistoryStatus, type PortalStudent } from '@ab/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { MonthDiamond } from '@ab/web-kit/components/family/panels/MonthDiamond';
import { FAM_EMPTY, FAM_MONTH, FAM_ROWS } from '@ab/web-kit/components/family/panels/panel-look';
import { cn } from '@ab/web-kit/lib/utils';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { portalHistoryQuery } from '@ab/web-kit/portal/api';
import { LoadState } from '@ab/web-kit/portal/LoadState';
import type { OpenReport } from '@ab/web-kit/portal/report/ReportView';
import { HistoryRow } from './HistoryRow';

interface Props {
  student: PortalStudent;
  status: PortalHistoryStatus;
  onOpenReport: (report: OpenReport) => void;
}

const EMPTY: Record<PortalHistoryStatus, () => [string, string]> = {
  attended: () => [t.portal.attendedEmpty, t.portal.attendedEmptyHint],
  absent: () => [t.portal.absentEmpty, t.portal.absentEmptyHint],
};

/** «أكتوبر 2026» of a «YYYY-MM» month (a calendar month, no zone). */
const monthName = (month: string): string =>
  dateText(new Date(`${month}-01T00:00:00Z`), { tz: 'UTC', locale }, { month: 'long', year: 'numeric' });

/** «عرض المزيد»: the next page (the family look: a white pill with a chevron). */
function MoreButton({ busy, onMore }: { busy: boolean; onMore: () => void }) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="justify-self-center family:min-h-12 family:px-6 family:text-[15px]
        family:font-extrabold family:text-lapis family:sm:min-h-12"
      disabled={busy}
      onClick={onMore}
    >
      <Icon name="chevron-down" className="hidden family:block" />
      {busy ? t.portal.loadingMore : t.portal.more}
    </Button>
  );
}

/** «حضرها» / «غاب عنها» (docs/50 §6): past lessons, newest first, by month, a page at a time. */
export function HistoryPanel({ student, status, onOpenReport }: Props) {
  const query = useInfiniteQuery(portalHistoryQuery({ studentId: student.id, status }));
  const [title, hint] = EMPTY[status]();
  return (
    <LoadState query={query}>
      {({ pages }) => {
        const months = historyMonths(historyRows(pages, status), student.tz);
        if (months.length === 0) {
          return <EmptyState title={title} className={FAM_EMPTY}>{hint}</EmptyState>;
        }
        return (
          <div className="grid gap-5 family:gap-6">
            {months.map(({ month, rows }) => (
              <section key={month} aria-label={monthName(month)} className="grid gap-2 family:gap-3.5">
                <h3 className={cn('text-sm font-semibold text-ink-2', FAM_MONTH)}>
                  <MonthDiamond />
                  {monthName(month)}
                </h3>
                <ul className={cn('grid gap-3', FAM_ROWS)}>
                  {rows.map((row) => (
                    <HistoryRow
                      key={row.lesson_id}
                      row={row}
                      student={student}
                      onOpenReport={onOpenReport}
                    />
                  ))}
                </ul>
              </section>
            ))}
            {query.hasNextPage && (
              <MoreButton
                busy={query.isFetchingNextPage}
                onMore={() => void query.fetchNextPage()}
              />
            )}
          </div>
        );
      }}
    </LoadState>
  );
}
