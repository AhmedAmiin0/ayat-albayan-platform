import { historyMonths, historyRows } from '@ab/client-core';
import type { PortalHistory, PortalHistoryStatus, PortalStudent } from '@ab/shared';
import { AppText, Button, EmptyState, t, type, useTheme } from '@ab/mobile-kit';
import { LoadState, MonthSection } from '#/ui/index.ts';
import { useChildHistory } from '#/portal/index.ts';
import { HistoryRow } from './HistoryRow';

interface HistoryPanelProps {
  student: PortalStudent;
  status: PortalHistoryStatus;
}

const EMPTY: Record<PortalHistoryStatus, () => string> = {
  attended: () => t.portal.attendedEmpty,
  absent: () => t.portal.absentEmpty,
};

/** The loaded pages under their months, or the empty note. */
function HistoryMonths({ pages, ...p }: HistoryPanelProps & { pages: readonly PortalHistory[] }) {
  const months = historyMonths(historyRows(pages, p.status), p.student.tz);
  if (months.length === 0) return <EmptyState title={EMPTY[p.status]()} />;
  return months.map(({ month, rows }) => (
    <MonthSection key={month} month={month}>
      {rows.map((row) => (
        <HistoryRow key={row.lesson_id} row={row} student={p.student} />
      ))}
    </MonthSection>
  ));
}

/** «حضرها» / «غاب عنها» (canvas Attended, Absent): newest first, by month, «عرض المزيد». */
export function HistoryPanel({ student, status }: HistoryPanelProps) {
  const { color } = useTheme();
  const history = useChildHistory(student.id, status);
  const more = history.isFetchingNextPage;
  return (
    <>
      <LoadState query={history}>
        {(data) => <HistoryMonths pages={data.pages} student={student} status={status} />}
      </LoadState>
      {history.hasNextPage ? (
        <Button
          variant="secondary"
          label={more ? t.portal.loadingMore : t.portal.more}
          busy={more}
          onPress={() => void history.fetchNextPage()}
        />
      ) : null}
      {status === 'absent' ? (
        <AppText style={{ fontSize: type.size.xs, color: color.ink3, textAlign: 'center' }}>
          {t.portal.app.history.reasonNote}
        </AppText>
      ) : null}
    </>
  );
}
