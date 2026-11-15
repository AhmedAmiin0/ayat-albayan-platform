import { historyMonths, historyRows } from '@ab/client-core';
import type { PortalHistoryStatus, PortalStudent } from '@ab/shared';
import { View } from 'react-native';
import {
  AppText,
  Button,
  EmptyState,
  ErrorState,
  SkeletonCard,
  t,
  type,
  useTheme,
} from '@ab/mobile-kit';
import { monthTitle } from '@/lessons';
import { useChildHistory } from '@/portal';
import { HistoryRow } from './HistoryRow';

interface HistoryPanelProps {
  student: PortalStudent;
  status: PortalHistoryStatus;
}

const EMPTY: Record<PortalHistoryStatus, () => string> = {
  attended: () => t.portal.attendedEmpty,
  absent: () => t.portal.absentEmpty,
};

/** «حضرها» / «غاب عنها» (canvas Attended, Absent): newest first, by month, «عرض المزيد». */
export function HistoryPanel({ student, status }: HistoryPanelProps) {
  const { color } = useTheme();
  const history = useChildHistory(student.id, status);
  if (!history.data) {
    return history.isError ? (
      <ErrorState onRetry={() => void history.refetch()} />
    ) : (
      <SkeletonCard />
    );
  }
  const months = historyMonths(historyRows(history.data.pages, status), student.tz);
  if (months.length === 0) return <EmptyState title={EMPTY[status]()} />;
  return (
    <>
      {months.map(({ month, rows }) => (
        <View key={month} style={{ gap: 8 }}>
          <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.sm, color: color.ink2 }}>
            {monthTitle(month)}
          </AppText>
          {rows.map((row) => (
            <HistoryRow key={row.lesson_id} row={row} student={student} />
          ))}
        </View>
      ))}
      {history.hasNextPage ? (
        <Button
          variant="secondary"
          label={history.isFetchingNextPage ? t.portal.loadingMore : t.portal.more}
          busy={history.isFetchingNextPage}
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
