import { ActivityIndicator } from 'react-native';
import { t, ErrorState, useTheme } from '@ab/mobile-kit';
import type { useTeacherChannels } from './channel-queries';

/** While the list is not in: its error with a retry, else the spinner. */
export function ListWaiting({ list }: { list: ReturnType<typeof useTeacherChannels> }) {
  const { color } = useTheme();
  if (list.isError)
    return <ErrorState message={t.studentChannel.loadFailed} onRetry={() => void list.refetch()} />;
  return (
    <ActivityIndicator
      accessibilityLabel={t.common.loading}
      color={color.lapis}
      style={{ paddingVertical: 32 }}
    />
  );
}
