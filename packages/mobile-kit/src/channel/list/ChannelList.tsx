import { channelBubbleActions, threadMessages } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import { FlatList, View } from 'react-native';
import { phoneTz } from '../lib/clock/phone-tz';
import { t } from '../lib/i18n/i18n';
import { useNow } from '../lib/time/use-now';
import { EmptyState } from '../ui/feedback/EmptyState';
import { Button } from '../ui/primitives/Button';
import { ChannelBubble } from './ChannelBubble';
import type { ChannelRef, useChannel } from './channel-api';

interface ChannelListProps {
  refs: ChannelRef;
  query: ReturnType<typeof useChannel>;
  /** A long press on a message whose «تعديل» / «حذف للجميع» this viewer may use now. */
  onHold: (message: ChannelMessageView) => void;
}

/**
 * The thread's messages in an inverted list, so it opens on the newest message and a new one
 * lands in view; «الرسائل الأقدم» at the top pages back. Times in the phone's zone; `now` ticks
 * by the minute (useNow), which also closes the 15-minute edit window on screen.
 */
export function ChannelList({ refs, query, onHold }: ChannelListProps) {
  const now = useNow();
  const tz = phoneTz();
  const newestFirst = threadMessages(query.data?.pages).reverse();
  if (newestFirst.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <EmptyState title={t.studentChannel.empty} />
      </View>
    );
  }
  const holdOf = (m: ChannelMessageView) => {
    const may = channelBubbleActions({ audience: refs.audience, message: m, now });
    return may.edit || may.delete ? () => onHold(m) : undefined;
  };
  const older = query.hasNextPage ? (
    <Button
      variant="ghost"
      label={t.studentChannel.older}
      busy={query.isFetchingNextPage}
      onPress={() => void query.fetchNextPage()}
    />
  ) : null;
  return (
    <FlatList
      inverted
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
      data={newestFirst}
      keyExtractor={(m) => m.id}
      renderItem={({ item }) => (
        <ChannelBubble message={item} tz={tz} now={now} onLongPress={holdOf(item)} />
      )}
      ListFooterComponent={older}
    />
  );
}
