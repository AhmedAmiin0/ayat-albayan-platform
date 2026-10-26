import { type MessageView, senderLine } from '@ab/shared';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { messageGap } from '../hooks/list-gap';
import { MessageBubble } from './MessageBubble';
import { DayChip } from '../days/DayChip';
import { dayLabel, opensDay } from '../days/day-label';
import { FloatingDay } from '../days/FloatingDay';
import { useTopDay } from '../days/use-top-day';
import { threadMessages } from '../../thread/hooks/thread-cache';
import { useJump } from '../../thread/hooks/use-jump';
import type { useThread } from '../../thread/hooks/use-thread';

type ThreadQuery = ReturnType<typeof useThread>;

/** How close to the newest message (pt) still follows a new one in. */
export const AT_NEWEST = 48;
/** How far from the top (in visible lengths) the next older page starts loading. */
export const OLDER_THRESHOLD = 0.4;

/**
 * Reaching the top loads the next older page by itself, as WhatsApp (owner 2026-10-27): one at a
 * time (the list can report the end twice before isFetchingNextPage turns true), only while there is one.
 */
function useOlder(query: ThreadQuery) {
  const asking = useRef(false);
  return () => {
    if (!query.hasNextPage || query.isFetchingNextPage || asking.current) return;
    asking.current = true;
    void Promise.resolve(query.fetchNextPage()).finally(() => (asking.current = false));
  };
}

/**
 * Inverted, newest first: offset 0 is exactly the newest message, so a chat opens on it and keeps it
 * in sight when the keyboard shrinks the list, with no guessed scroll. Older pages load at the top (the
 * footer of an inverted list, a spinner meanwhile); they grow the content away from offset 0, so the
 * bubbles on screen stay put. A day chip opens each day; while scrolling, the topmost day floats on top.
 * A new message follows in only near the newest; one she sends always: her optimistic row, the only
 * outbound row with no sender line (a job's or a colleague's has one).
 * ponytail: a file goes up with no optimistic row, so it follows in only near the newest; key the send
 * mutations and read useMutationState if it must always follow.
 */
export function MessageList({ phone, query }: { phone: string; query: ThreadQuery }) {
  const { color } = useTheme();
  const list = useRef<FlatList<MessageView>>(null);
  // Her own pull only: a background refetch (open, send, push) must not spin over the newest bubble.
  const [pulling, setPulling] = useState(false);
  const rows = threadMessages(query.data).reverse();
  const newest = rows[0];
  const ours = newest?.direction === 'outbound' && !senderLine(newest) ? newest.id : undefined;
  useEffect(() => {
    if (ours) list.current?.scrollToOffset({ offset: 0, animated: true });
  }, [ours]);
  // A tap on a quote scrolls to the original (owner 2026-10-25 «رد»), loading older pages if needed.
  const { lit, jump, onScrollToIndexFailed } = useJump(list, rows, query);
  const onEndReached = useOlder(query);
  const top = useTopDay();
  return (
    <View style={{ flex: 1 }}>
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
          <View testID={`message-row-${item.id}`} style={{ paddingTop: messageGap(rows[index + 1], item) }}>
            {opensDay(rows, index) ? <DayChip testID={`day-${item.id}`} label={dayLabel(item.created_at)} /> : null}
            <MessageBubble message={item} phone={phone} onJump={jump} highlight={lit === item.id} />
          </View>
        )}
        maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: AT_NEWEST }}
        onEndReached={onEndReached}
        onEndReachedThreshold={OLDER_THRESHOLD}
        {...top.list}
        refreshing={pulling}
        onRefresh={() => {
          setPulling(true);
          void query.refetch().finally(() => setPulling(false));
        }}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator testID="older-loading" accessibilityLabel={t.common.loading} color={color.ink2} style={{ padding: 12 }} />
          ) : null
        }
        // The list clones its empty cell to flip it upright; EmptyState drops that style, a View keeps it.
        ListEmptyComponent={
          <View testID="message-empty">
            <EmptyState title={t.inbox.empty} />
          </View>
        }
      />
      <FloatingDay label={top.label} opacity={top.opacity} />
    </View>
  );
}
