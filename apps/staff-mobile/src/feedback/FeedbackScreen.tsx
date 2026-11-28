import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import {
  BackButton,
  EmptyState,
  ErrorLine,
  ErrorState,
  LazyList,
  Screen,
  ScreenHeader,
  t,
  useTheme,
} from '@ab/mobile-kit';
import { AverageCard } from './AverageCard';
import { FeedbackRow } from './FeedbackRow';
import { useFeedbackList, useFeedbackSummary } from './queries';
import type { FeedbackRowView } from './types';

const keyOf = (row: FeedbackRowView) => row.id;
const renderRow = ({ item }: { item: FeedbackRowView }) => <FeedbackRow row={item} />;

/**
 * Student feedback for admins: each teacher's average, answers and yes share on top, then every
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
        leading={<BackButton onPress={() => router.back()} />}
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
