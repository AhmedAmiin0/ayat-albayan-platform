import { ActivityIndicator, View } from 'react-native';
import { t, useTheme, EmptyState, ErrorState } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';

interface LoadStateProps {
  /** The query: no data yet, failed, or loaded (then `empty` decides). */
  status: { data: unknown; isError: boolean; refetch: () => unknown };
  empty: boolean;
  emptyTitle: string;
  emptyHint?: string;
}

/**
 * Loading / failed / empty for a money list, with the web's words: an error only when nothing is
 * cached (offline keeps the last list on screen). Renders nothing when there are rows.
 */
export function LoadState({ status, empty, emptyTitle, emptyHint }: LoadStateProps) {
  const { color } = useTheme();
  if (!status.data) {
    return status.isError ? (
      <ErrorState message={t.sales.loadFailed} onRetry={() => void status.refetch()} />
    ) : (
      <ActivityIndicator
        accessibilityLabel={t.common.loading}
        color={color.lapis}
        style={{ paddingVertical: 32 }}
      />
    );
  }
  if (!empty) return null;
  return (
    <View style={{ gap: 8 }}>
      <EmptyState title={emptyTitle} />
      {emptyHint ? <Note>{emptyHint}</Note> : null}
    </View>
  );
}
