import { t, EmptyState, ErrorState } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';

interface StateNoteProps {
  /** The query's state: no data yet, failed, or loaded (then `empty` decides). */
  status: { data: unknown; isError: boolean; refetch: () => unknown };
  empty: boolean;
  emptyTitle: string;
}

/**
 * Loading / error / empty for a finance list, as the other screens do it: an error only when nothing
 * is cached (offline keeps the last list on screen, with `stale` below). Renders nothing when there are rows.
 */
export function StateNote({ status, empty, emptyTitle }: StateNoteProps) {
  if (!status.data) {
    return status.isError ? (
      <ErrorState onRetry={() => void status.refetch()} message={t.mobileFinance.loadFailed} />
    ) : (
      <Note>{t.common.loading}</Note>
    );
  }
  return empty ? <EmptyState title={emptyTitle} /> : null;
}

/** Cached data is shown but the last refresh failed. */
export function StaleNote({ isError, hasData }: { isError: boolean; hasData: boolean }) {
  return isError && hasData ? <Note>{t.mobileFinance.stale}</Note> : null;
}
