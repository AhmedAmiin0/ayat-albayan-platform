import { router } from 'expo-router';
import { FlatList, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { AverageCard } from './AverageCard';
import { FeedbackRow } from './FeedbackRow';
import { useFeedbackList, useFeedbackSummary } from './queries';

/**
 * «رأيك يهمّنا» for admins: each teacher's average, answers and «نعم» share on top, then every
 * request and answer, newest first. Read-only; the request itself is sent from the lesson.
 */
export function FeedbackScreen() {
  const list = useFeedbackList();
  const summary = useFeedbackSummary();
  return (
    <Screen>
      <ScreenHeader
        title={t.mobile.feedback.title}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        data={list.items}
        keyExtractor={(row) => row.id}
        renderItem={({ item }) => <FeedbackRow row={item} />}
        onEndReached={list.loadMore}
        refreshing={list.isRefetching}
        onRefresh={() => {
          list.refresh();
          void summary.refetch();
        }}
        ListHeaderComponent={
          summary.data?.length ? (
            <View style={{ gap: 8 }}>
              {summary.data.map((row) => (
                <AverageCard key={row.teacher.id} name={row.teacher.name} average={row} />
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          list.isPending ? null : list.isError ? (
            <ErrorState onRetry={list.refresh} />
          ) : (
            <EmptyState title={t.mobile.feedback.empty} />
          )
        }
      />
    </Screen>
  );
}
