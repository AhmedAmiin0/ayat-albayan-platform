import { router } from 'expo-router';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { AssistantLessonItem } from '@/classroom/AssistantLessonItem';
import { joinableRows } from '@/classroom/assistant-lessons';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useSalesLive } from './sales-api';

/**
 * «الحلقات الجارية الآن» (web /sales/live): every lesson running now in the academy, re-read every
 * minute, with the classroom assistant's row and «ادخل الحلقة» (POST /lessons/:id/room/join lets them
 * in as `assistant`, or as `sales` on their own trial; the web classroom opens in the browser).
 */
export function SalesLiveScreen() {
  const { color } = useTheme();
  const live = useSalesLive();
  const rows = joinableRows(live.data ?? []);
  return (
    <Screen>
      <ScreenHeader
        title={t.sales.live.title}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <FlatList
        style={{ flex: 1 }}
        data={rows}
        keyExtractor={(r) => r.view.lesson_id}
        renderItem={({ item }) => <AssistantLessonItem view={item.view} lesson={item.lesson} />}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        refreshing={live.isRefetching}
        onRefresh={() => void live.refetch()}
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
