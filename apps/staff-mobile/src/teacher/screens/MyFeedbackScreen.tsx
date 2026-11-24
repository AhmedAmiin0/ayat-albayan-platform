import { router } from 'expo-router';
import { FlatList } from 'react-native';
import { t, BackButton, EmptyState, ErrorState, Screen, ScreenHeader } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { AverageCard } from '@/feedback/AverageCard';
import { FeedbackRow } from '@/feedback/FeedbackRow';
import { useMyFeedback } from '@/feedback/queries';

/** The API serves only her rows, without the parent's contact number; read-only. */
export function MyFeedbackScreen() {
  const feedback = useMyFeedback();
  const mine = feedback.data;
  return (
    <Screen>
      <ScreenHeader
        title={t.mobile.feedback.title}
        leading={<BackButton onPress={() => router.back()} />}
      />
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        data={mine?.items ?? []}
        keyExtractor={(row) => row.id}
        renderItem={({ item }) => <FeedbackRow row={item} />}
        refreshing={feedback.isRefetching}
        onRefresh={() => void feedback.refetch()}
        ListHeaderComponent={mine ? <AverageCard name={null} average={mine.average} /> : null}
        ListEmptyComponent={
          mine ? (
            <EmptyState title={t.mobile.feedback.empty} />
          ) : feedback.isError ? (
            <ErrorState onRetry={() => void feedback.refetch()} />
          ) : (
            <Note>{t.common.loading}</Note>
          )
        }
      />
    </Screen>
  );
}
