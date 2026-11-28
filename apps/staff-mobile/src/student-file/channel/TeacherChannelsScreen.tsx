import type { TeacherChannelRow } from '@ab/shared';
import type { ReactElement } from 'react';
import { router } from 'expo-router';
import {
  BackButton,
  EmptyState,
  Screen,
  ScreenHeader,
  t,
  LazyList,
} from '@ab/mobile-kit';
import { useTeacherChannels } from './channel-queries';
import { ListWaiting } from './list/ListWaiting';
import { TeacherChannelItem } from './list/TeacherChannelItem';

const keyOf = (r: TeacherChannelRow) => r.student_id;

const renderRow = ({ item }: { item: TeacherChannelRow }): ReactElement => (
  <TeacherChannelItem item={item} />
);

/** Student messages (docs/31 §2): one row per current student, newest activity first. */
export function TeacherChannelsScreen() {
  const list = useTeacherChannels();
  return (
    <Screen list>
      <ScreenHeader
        title={t.studentChannel.title}
        size="h2"
        connecting
        count={list.data?.length}
        leading={<BackButton onPress={() => router.back()} />}
      />
      <LazyList
        data={list.data ?? []}
        keyExtractor={keyOf}
        renderItem={renderRow}
        ListEmptyComponent={
          list.data ? (
            <EmptyState title={t.studentChannel.listEmpty} />
          ) : (
            <ListWaiting list={list} />
          )
        }
      />
    </Screen>
  );
}
