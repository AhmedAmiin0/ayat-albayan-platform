import { router } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AssistantLessonItem } from '@/classroom/assistants/AssistantLessonItem';
import { joinableRows } from '@/classroom/assistants/assistant-lessons';
import {
  BackButton,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  t,
  usePullRefresh,
  useTheme,
  LazyList,
} from '@ab/mobile-kit';
import { useSalesLive } from '@/sales/sales/lib/sales-api';

type Row = ReturnType<typeof joinableRows>[number];

/** Every lesson running now, re-read every minute; join lets them in as assistant. */
export function SalesLiveScreen() {
  const { color } = useTheme();
  const live = useSalesLive();
  const pull = usePullRefresh(live.refetch);
  const rows = joinableRows(live.data ?? []);
  const row = useCallback(
    ({ item }: { item: Row }) => (
      <View style={{ padding: 16 }}>
        <AssistantLessonItem view={item.view} lesson={item.lesson} />
      </View>
    ),
    [],
  );
  return (
    <Screen list>
      <ScreenHeader
        title={t.sales.live.title}
        size="h2"
        connecting
        count={live.data ? rows.length : undefined}
        leading={<BackButton onPress={() => router.back()} />}
      />
      <LazyList
        data={rows}
        keyExtractor={(r) => r.view.lesson_id}
        renderItem={row}
        refreshing={pull.refreshing}
        onRefresh={pull.onRefresh}
        ListEmptyComponent={
          live.data ? (
            <EmptyState title={t.sales.live.empty} />
          ) : live.isError ? (
            <ErrorState message={t.sales.loadFailed} onRetry={() => void live.refetch()} />
          ) : (
            <ActivityIndicator
              accessibilityLabel={t.common.loading}
              color={color.lapis}
              style={{ paddingVertical: 32 }}
            />
          )
        }
      />
    </Screen>
  );
}
