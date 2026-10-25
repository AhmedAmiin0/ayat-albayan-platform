import type { NotificationItem } from '@ab/shared';
import { router } from 'expo-router';
import { FlatList, View } from 'react-native';
import { usePermissions } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { routeIn, type PushTree } from '@/core/push/notification-route';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { NotificationRow } from './NotificationRow';
import { useMarkRead, useNotifications } from './use-notifications';

export interface NotificationsScreenProps {
  /** The tree it sits in: a row opens that tree's screen. */
  tree: PushTree;
}

/**
 * «الإشعارات» (R-NOT-01): the newest 20 of my notifications, unread ones marked. A tap marks the
 * row read and opens its screen (the same map as a tapped push); «تحديد الكل كمقروء» while any is
 * unread. Pull to refresh; with nothing cached, a failed read offers a retry.
 */
export function NotificationsScreen({ tree }: NotificationsScreenProps) {
  const list = useNotifications();
  const markRead = useMarkRead();
  const can = usePermissions();
  const bell = t.bell.mobile;
  const unread = list.data?.unread ?? 0;
  const open = (item: NotificationItem) => {
    if (!item.read_at) markRead.mutate([item.id]);
    const href = routeIn(tree, { ...item.data, kind: item.kind }, can);
    if (href) router.push(href);
  };
  const back = <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />;
  return (
    <Screen>
      <ScreenHeader title={bell.screenTitle} trailing={back} />
      {unread > 0 ? (
        <View style={{ alignItems: 'flex-start' }}>
          <Button variant="secondary" label={bell.markAll} onPress={() => markRead.mutate(undefined)} />
        </View>
      ) : null}
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        data={list.data?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationRow item={item} onPress={open} />}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        ListEmptyComponent={
          list.isPending ? (
            <Note>{t.common.loading}</Note>
          ) : list.data ? (
            <View style={{ paddingHorizontal: 16 }}>
              <EmptyState title={bell.empty} />
            </View>
          ) : (
            <ErrorState onRetry={() => void list.refetch()} message={bell.loadError} />
          )
        }
      />
    </Screen>
  );
}
