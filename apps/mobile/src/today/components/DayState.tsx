import { t } from '@/core/lib/i18n/i18n';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';

interface DayStateProps {
  /** The first answer has not come yet: nothing to say. */
  pending: boolean;
  /** No day at all (it failed with nothing saved). */
  failed: boolean;
  /** The day has no lessons. */
  empty: boolean;
  /** A column filter left nothing to show. */
  filteredOut: boolean;
  onRetry: () => void;
}

/** Today's empty and error states (docs/29 §6: as before), or nothing while there is a day to show. */
export function DayState({ pending, failed, empty, filteredOut, onRetry }: DayStateProps) {
  if (pending) return null;
  if (failed) return <ErrorState onRetry={onRetry} />;
  if (empty) return <EmptyState title={t.today.empty} />;
  return filteredOut ? <EmptyState title={t.today.emptyFilter} /> : null;
}
