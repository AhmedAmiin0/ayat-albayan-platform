import type { NotificationItem } from '@ab/shared';
import { router } from 'expo-router';
import { openPushed } from '@/core/nav/back-within';
import { useCallback } from 'react';
import { FlatList, type ListRenderItemInfo, View } from 'react-native';
import {
  usePermissions,
  t,
  BackButton,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  usePullRefresh,
  useMarkRead,
  useNotifications,
} from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { routeIn, type PushTree } from '@/core/push/notification-route';
import { PillButton } from '@/core/ui/primitives/PillButton';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import { NotificationRow } from './NotificationRow';

export interface NotificationsScreenProps {
  /** The tree it sits in: a row opens that tree's screen. */
  tree: PushTree;
}

/** R-NOT-01: newest 20; a tap marks read and opens the same target as a tapped push. */
export function NotificationsScreen({ tree }: NotificationsScreenProps) {
  const list = useNotifications();
  const pull = usePullRefresh(list.refetch);
  const markRead = useMarkRead();
  const can = usePermissions();
  const bell = t.bell.mobile;
  const unread = list.data?.unread ?? 0;
  const { mutate } = markRead;
  const open = useCallback(
    (item: NotificationItem) => {
      if (!item.read_at) mutate([item.id]);
      const href = routeIn(tree, { ...item.data, kind: item.kind }, can);
      if (href) openPushed(href);
    },
    [mutate, tree, can],
  );
  const items = list.data?.items ?? [];
  const renderRow = useCallback(
    ({ item }: ListRenderItemInfo<NotificationItem>) => <NotificationRow item={item} onPress={open} />,
    [open],
  );
  const cells = useInsetRows(renderRow, items.length);
  const back = <BackButton onPress={() => router.back()} />;
  return (
    <Screen>
      <ScreenHeader title={bell.screenTitle} size="h2" connecting leading={back} />
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
        refreshing={pull.refreshing}
        onRefresh={pull.onRefresh}
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
