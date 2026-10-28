import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { LazyList } from '@/core/ui/lists/LazyList';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { AverageCard } from './AverageCard';
import { FeedbackRow } from './FeedbackRow';
import { useFeedbackList, useFeedbackSummary } from './queries';
import type { FeedbackRowView } from './types';

const keyOf = (row: FeedbackRowView) => row.id;
const renderRow = ({ item }: { item: FeedbackRowView }) => <FeedbackRow row={item} />;

/**
 * «رأيك يهمّنا» for admins: each teacher's average, answers and «نعم» share on top, then every
 * request and answer, newest first. Read-only; the request itself is sent from the lesson.
 */
export function FeedbackScreen() {
  const list = useFeedbackList();
  const summary = useFeedbackSummary();
  const { color } = useTheme();
  return (
    <Screen>
      <ScreenHeader
        title={t.mobile.feedback.title}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <LazyList
        inset={false}
        tabBar={false}
        endSpace={24}
        gap={12}
        paged={list}
        keyExtractor={keyOf}
        renderItem={renderRow}
        refreshing={list.isRefetching}
        onRefresh={() => {
          list.refresh();
          void summary.refetch();
        }}
        ListHeaderComponent={
          summary.isError ? (
            <ErrorLine message={t.common.error} />
          ) : summary.data?.length ? (
            <View style={{ gap: 8 }}>
              {summary.data.map((row) => (
                <AverageCard key={row.teacher.id} name={row.teacher.name} average={row} />
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          list.isPending ? (
            <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
          ) : list.isError ? (
            <ErrorState onRetry={list.refresh} />
          ) : (
            <EmptyState title={t.mobile.feedback.empty} />
          )
        }
      />
    </Screen>
  );
}
