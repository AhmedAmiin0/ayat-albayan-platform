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

/**
 * «الحلقات الجارية الآن» (web /sales/live): every lesson running now in the academy, re-read every
 * minute, with the classroom assistant's row and «ادخل الحلقة» (POST /lessons/:id/room/join lets them
 * in as `assistant`, or as `sales` on their own trial; the web classroom opens in the browser).
 * The count on the title's line and the lessons in one inset card (owner 2026-10-28: one container rule).
 */
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
