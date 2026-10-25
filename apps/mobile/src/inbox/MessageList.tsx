import { type MessageView, senderLine } from '@ab/shared';
import { useEffect, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { messageGap } from './list-gap';
import { MessageBubble } from './MessageBubble';
import { threadMessages } from './thread-cache';
import { useJump } from './use-jump';
import type { useThread } from './use-thread';

type ThreadQuery = ReturnType<typeof useThread>;

/** How close to the newest message (pt) still follows a new one in. */
export const AT_NEWEST = 48;

/**
 * Inverted, newest first: offset 0 is exactly the newest message, so a chat opens on it and keeps it
 * in sight when the keyboard shrinks the list, with no guessed scroll. «رسائل أقدم» sits on top (the
 * footer of an inverted list). A new message follows in only near the newest; one she sends always:
 * her optimistic row, the only outbound row with no sender line (a job's or a colleague's has one).
 * ponytail: a file goes up with no optimistic row, so it follows in only near the newest; key the send
 * mutations and read useMutationState if it must always follow.
 */
export function MessageList({ phone, query }: { phone: string; query: ThreadQuery }) {
  const list = useRef<FlatList<MessageView>>(null);
  // Her own pull only: a background refetch (open, send, push) must not spin over the newest bubble.
  const [pulling, setPulling] = useState(false);
  const rows = threadMessages(query.data).reverse();
  const newest = rows[0];
  const ours = newest?.direction === 'outbound' && !senderLine(newest) ? newest.id : undefined;
  useEffect(() => {
    if (ours) list.current?.scrollToOffset({ offset: 0, animated: true });
  }, [ours]);
  // A tap on a quote scrolls to the original (owner 2026-10-25 «رد»).
  const { lit, jump, onScrollToIndexFailed } = useJump(list, rows);
  const older = query.hasNextPage ? (
    <Button
      variant="ghost"
      label={t.inbox.loadOlder}
      busy={query.isFetchingNextPage}
      onPress={() => void query.fetchNextPage()}
    />
  ) : null;
  return (
    <FlatList
      ref={list}
      testID="message-list"
      inverted
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingVertical: 4 }}
      data={rows}
      keyExtractor={(m) => m.id}
      extraData={lit}
      onScrollToIndexFailed={onScrollToIndexFailed}
      renderItem={({ item, index }) => (
        // Each cell is flipped back upright, so its top is still the visual top: the older neighbour.
        <View
          testID={`message-row-${item.id}`}
          style={{ paddingTop: messageGap(rows[index + 1], item) }}
        >
          <MessageBubble message={item} phone={phone} onJump={jump} highlight={lit === item.id} />
        </View>
      )}
      maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: AT_NEWEST }}
      refreshing={pulling}
      onRefresh={() => {
        setPulling(true);
        void query.refetch().finally(() => setPulling(false));
      }}
      ListFooterComponent={older}
      // The list clones its empty cell to flip it upright; EmptyState drops that style, a View keeps it.
      ListEmptyComponent={
        <View testID="message-empty">
          <EmptyState title={t.inbox.empty} />
        </View>
      }
    />
  );
}
