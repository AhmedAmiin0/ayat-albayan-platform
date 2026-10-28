import type { NotificationItem } from '@ab/shared';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, type ListRenderItemInfo, View } from 'react-native';
import { usePermissions } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { routeIn, type PushTree } from '@/core/push/notification-route';
import { Button } from '@/core/ui/primitives/Button';
import { PillButton } from '@/core/ui/primitives/PillButton';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import { NotificationRow } from './NotificationRow';
import { useMarkRead, useNotifications } from './use-notifications';

export interface NotificationsScreenProps {
  /** The tree it sits in: a row opens that tree's screen. */
  tree: PushTree;
}

/**
 * «الإشعارات» (R-NOT-01): the newest 20 of my notifications, unread ones marked. A tap marks the
 * row read and opens its screen (the same map as a tapped push); «تحديد الكل كمقروء» while any is
 * unread. Pull to refresh; with nothing cached, a failed read offers a retry. The list screens' compact
 * top and one inset card of rows (owner 2026-10-28): «تحديد الكل كمقروء» is a pill, not a full button.
 */
export function NotificationsScreen({ tree }: NotificationsScreenProps) {
  const list = useNotifications();
  const markRead = useMarkRead();
  const can = usePermissions();
  const bell = t.bell.mobile;
  const unread = list.data?.unread ?? 0;
  const { mutate } = markRead;
  const open = useCallback(
    (item: NotificationItem) => {
      if (!item.read_at) mutate([item.id]);
      const href = routeIn(tree, { ...item.data, kind: item.kind }, can);
      if (href) router.push(href);
    },
    [mutate, tree, can],
  );
  const items = list.data?.items ?? [];
  const renderRow = useCallback(
    ({ item }: ListRenderItemInfo<NotificationItem>) => <NotificationRow item={item} onPress={open} />,
    [open],
  );
  const cells = useInsetRows(renderRow, items.length);
  const back = <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />;
  return (
    <Screen>
      <ScreenHeader title={bell.screenTitle} size="h2" connecting trailing={back} />
      {unread > 0 ? (
        <View style={{ alignItems: 'flex-start' }}>
          <PillButton label={bell.markAll} onPress={() => mutate(undefined)} />
        </View>
      ) : null}
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        data={items}
        keyExtractor={(item) => item.id}
        {...cells}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        ListEmptyComponent={
          list.isPending ? (
            <Note>{t.common.loading}</Note>
          ) : list.data ? (
            <EmptyState title={bell.empty} />
          ) : (
            <ErrorState onRetry={() => void list.refetch()} message={bell.loadError} />
          )
        }
      />
    </Screen>
  );
}
