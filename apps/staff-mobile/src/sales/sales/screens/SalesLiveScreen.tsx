import { router } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, type ListRenderItemInfo, View } from 'react-native';
import { AssistantLessonItem } from '@/classroom/assistants/AssistantLessonItem';
import { joinableRows } from '@/classroom/assistants/assistant-lessons';
import {
  t,
  useTheme,
  BackButton,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  useTabBarInset,
  usePullRefresh,
} from '@ab/mobile-kit';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import { useSalesLive } from '@/sales/sales/lib/sales-api';

type Row = ReturnType<typeof joinableRows>[number];

/** Every lesson running now, re-read every minute; join lets them in as assistant. */
export function SalesLiveScreen() {
  const { color } = useTheme();
  const live = useSalesLive();
  const pull = usePullRefresh(live.refetch);
  const rows = joinableRows(live.data ?? []);
  const inset = useTabBarInset();
  const row = useCallback(
    ({ item }: ListRenderItemInfo<Row>) => (
      <View style={{ padding: 16 }}>
        <AssistantLessonItem view={item.view} lesson={item.lesson} />
      </View>
    ),
    [],
  );
  const cells = useInsetRows(row, rows.length);
  return (
    <Screen list>
      <ScreenHeader
        title={t.sales.live.title}
        size="h2"
        connecting
        count={live.data ? rows.length : undefined}
        leading={<BackButton onPress={() => router.back()} />}
      />
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 + inset }}
        data={rows}
        keyExtractor={(r) => r.view.lesson_id}
        {...cells}
        refreshing={pull.refreshing}
        onRefresh={pull.onRefresh}
        ListEmptyComponent={
          live.data ? (
            <EmptyState title={t.sales.live.empty} />
          ) : live.isError ? (
            <ErrorState message={t.sales.loadFailed} onRetry={() => void live.refetch()} />
          ) : (
            <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
          )
        }
      />
    </Screen>
  );
}
