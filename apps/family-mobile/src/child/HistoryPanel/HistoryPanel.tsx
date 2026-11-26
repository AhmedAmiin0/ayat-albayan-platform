import { AppText, Button, t, type, useTheme } from '@ab/mobile-kit';
import { LoadState } from '@/ui';
import { HistoryMonths } from './HistoryMonths';
import type { HistoryPanelProps } from './HistoryPanel.types';
import { useHistoryPanel } from './use-history-panel';

/** Newest first, grouped by month. */
export function HistoryPanel({ student, status }: HistoryPanelProps) {
  const { color } = useTheme();
  const { history, more, loadMore } = useHistoryPanel(student.id, status);
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
          onPress={loadMore}
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
