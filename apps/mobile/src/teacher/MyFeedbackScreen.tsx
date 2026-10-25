import { router } from 'expo-router';
import { FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { AverageCard } from '@/feedback/AverageCard';
import { FeedbackRow } from '@/feedback/FeedbackRow';
import { useMyFeedback } from '@/feedback/queries';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';

/**
 * «رأيك يهمّنا» for a teacher: my own average and the answers about my lessons, newest first.
 * The API serves only my rows, without the parent's contact number. Read-only.
 */
export function MyFeedbackScreen() {
  const feedback = useMyFeedback();
  const mine = feedback.data;
  return (
    <Screen>
      <ScreenHeader
        title={t.mobile.feedback.title}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
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
