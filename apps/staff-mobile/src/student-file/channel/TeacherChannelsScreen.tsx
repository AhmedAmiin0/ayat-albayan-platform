import type { TeacherChannelRow } from '@ab/shared';
import type { ReactElement } from 'react';
import { router } from 'expo-router';
import { FlatList, type ListRenderItemInfo } from 'react-native';
import { t, EmptyState, Screen, ScreenHeader, useTabBarInset, BackButton } from '@ab/mobile-kit';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import { useTeacherChannels } from './channel-queries';
import { ListWaiting } from './list/ListWaiting';
import { TeacherChannelItem } from './list/TeacherChannelItem';

const keyOf = (r: TeacherChannelRow) => r.student_id;

const renderRow = ({ item }: ListRenderItemInfo<TeacherChannelRow>): ReactElement => (
  <TeacherChannelItem item={item} />
);

/**
 * «رسائل الطلاب» (docs/31 §2): one row per current student, newest activity first, my unread count;
 * the count on the title's line, the rows in one inset card inside the gutter (owner 2026-10-28).
 */
export function TeacherChannelsScreen() {
  const inset = useTabBarInset();
  const list = useTeacherChannels();
  const rows = useInsetRows(renderRow, list.data?.length ?? 0);
  return (
    <Screen list>
      <ScreenHeader
        title={t.studentChannel.title}
        size="h2"
        connecting
        count={list.data?.length}
        leading={<BackButton onPress={() => router.back()} />}
      />
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 + inset }}
        data={list.data ?? []}
        keyExtractor={keyOf}
        ListEmptyComponent={
          list.data ? (
            <EmptyState title={t.studentChannel.listEmpty} />
          ) : (
            <ListWaiting list={list} />
          )
        }
        {...rows}
      />
    </Screen>
  );
}
