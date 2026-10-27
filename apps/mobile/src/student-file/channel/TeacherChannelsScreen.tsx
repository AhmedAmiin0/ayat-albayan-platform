import { router } from 'expo-router';
import { ActivityIndicator, FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { ListRow } from '@/core/ui/layout/ListRow';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { Button } from '@/core/ui/primitives/Button';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { useTheme } from '@/theme';
import { useTeacherChannels } from './channel-queries';

/** «رسائل الطلاب» (docs/31 §2): one row per current student, newest activity first, my unread count. */
export function TeacherChannelsScreen() {
  const { color } = useTheme();
  const inset = useTabBarInset();
  const list = useTeacherChannels();
  return (
    <Screen list>
      <ScreenHeader title={t.studentChannel.title} trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />} />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ paddingBottom: 24 + inset }}
        data={list.data ?? []}
        keyExtractor={(r) => r.student_id}
        renderItem={({ item }) => (
          <ListRow
            title={item.student_name}
            meta={item.student_code}
            subtitle={item.last_message?.body ?? t.studentChannel.noMessageYet}
            trailing={item.unread > 0 ? <StatusChip size="sm" tone="act" glyph="fill" label={t.studentChannel.unread.replace('{n}', String(item.unread))} /> : undefined}
            onPress={() => router.push(`/teacher/more/messages/${item.student_id}`)}
          />
        )}
        ListEmptyComponent={
          list.data ? (
            <EmptyState title={t.studentChannel.listEmpty} />
          ) : list.isError ? (
            <ErrorState message={t.studentChannel.loadFailed} onRetry={() => void list.refetch()} />
          ) : (
            <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
          )
        }
      />
    </Screen>
  );
}
