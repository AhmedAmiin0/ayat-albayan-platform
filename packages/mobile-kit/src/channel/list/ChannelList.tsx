import { FlatList, View } from 'react-native';
import { FloatingDay } from '../../chat-ui/days/FloatingDay';
import { t } from '../../lib/i18n/i18n';
import { EmptyState } from '../../ui/feedback/EmptyState';
import { Button } from '../../ui/primitives/Button';
import type { ChannelRef, useChannel } from '../channel-api';
import { ChannelRowItem, type RowActions } from './ChannelRowItem';
import { useFloatingDay } from './use-floating-day';
import { useChannelRows } from './use-channel-rows';
import { useJump } from './use-jump';

interface ChannelListProps {
  refs: ChannelRef;
  query: ReturnType<typeof useChannel>;
  mode: 'write' | 'read' | 'closed';
  actions: Omit<RowActions, 'onJump'>;
}

/**
 * The thread's messages in an inverted list, so it opens on the newest message and a new one
 * lands in view: day chips, the floating day while scrolling, «n غير مقروءة» over the first unread
 * when it opened; «الرسائل الأقدم» at the top pages back. Times in the phone's zone; `now` ticks
 * by the minute (useNow), which also closes the 15-minute edit window on screen.
 */
export function ChannelList({ refs, query, mode, actions }: ChannelListProps) {
  const { rows, clock } = useChannelRows({
    pages: query.data?.pages,
    more: query.hasNextPage,
  });
  const { listRef, lit, jump, onScrollToIndexFailed } = useJump(rows);
  const floating = useFloatingDay();
  if (rows.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <EmptyState title={t.studentChannel.empty} />
      </View>
    );
  }
  const older = query.hasNextPage ? (
    <Button
      variant="ghost"
      label={t.studentChannel.older}
      busy={query.isFetchingNextPage}
      onPress={() => void query.fetchNextPage()}
    />
  ) : null;
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={listRef}
        inverted
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 4 }}
        data={rows}
        keyExtractor={(row) => row.message.id}
        renderItem={({ item }) => (
          <ChannelRowItem
            row={item}
            audience={refs.audience}
            mode={mode}
            clock={clock}
            lit={lit === item.message.id}
            actions={{ ...actions, onJump: jump }}
          />
        )}
        ListFooterComponent={older}
        onViewableItemsChanged={floating.onViewable}
        onScrollToIndexFailed={onScrollToIndexFailed}
        {...floating.scroll}
      />
      <FloatingDay label={floating.label} opacity={floating.opacity} />
    </View>
  );
}
