import { type CallView, chatDayKey, senderLine } from '@ab/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useStableHandler } from '@/core/lib/stable-handler';
import { useTheme } from '@/theme';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { logRows, type LogRow } from '../../thread/calls/entries/log-rows';
import { useCallBack, useThreadCalls } from '../../thread/calls/entries/use-thread-calls';
import { messageGap } from '../hooks/list-gap';
import { deviceTimeZone } from '../hooks/message-text';
import { MessageRow } from '../list/MessageRow';
import { dayLabel, hasDayChip } from '../days/day-label';
import { CellFrames } from '../days/DayCell';
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
    void Promise.resolve(query.fetchNextPage({ cancelRefetch: false })).finally(() => (asking.current = false));
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
  const list = useRef<FlatList<LogRow>>(null);
  // Her own pull only: a background refetch (open, send, push) must not spin over the newest bubble.
  const [pulling, setPulling] = useState(false);
  // Calls merged in by time (docs/28 §5); none while calls are off. One array per change: a new one each
  // render would reset the list's viewability (the floating day).
  const calls = useThreadCalls(phone);
  const callBack = useCallBack({ phone, thread: query.data?.pages[0]?.thread ?? null });
  const more = query.hasNextPage;
  const rows = useMemo(() => logRows(threadMessages(query.data), { calls, hasMore: more }), [query.data, calls, more]);
  const newest = rows[0]?.message;
  const ours = newest?.direction === 'outbound' && !senderLine(newest) ? newest.id : undefined;
  useEffect(() => {
    if (ours) list.current?.scrollToOffset({ offset: 0, animated: true });
  }, [ours]);
  // A tap on a quote scrolls to the original (owner 2026-10-25 «رد»), loading older pages if needed.
  const { lit, jump, onScrollToIndexFailed } = useJump(list, rows, query);
  const onJump = useStableHandler(jump);
  const callBackNow = useStableHandler((call: CallView) => callBack?.(call));
  const onCallBack = callBack ? callBackNow : undefined;
  // Rows get primitives and the cached message objects: memo MessageRow redraws only what changed.
  // The oldest loaded row gets its chip only once no older page can continue its day.
  const renderItem = useCallback(
    ({ item, index }: { item: LogRow; index: number }) => (
      <MessageRow
        id={item.id}
        message={item.message}
        call={item.call}
        gap={messageGap(rows[index + 1], item)}
        day={hasDayChip(rows, index, more) ? dayLabel(item.created_at) : null}
        phone={phone}
        onJump={onJump}
        highlight={lit === item.id}
        onCallBack={onCallBack}
      />
    ),
    [rows, more, phone, onJump, lit, onCallBack],
  );
  const onEndReached = useOlder(query);
  // «اليوم» / «أمس» move at midnight with no new message: today's key redraws the rows' day chips.
  const today = chatDayKey(new Date(), deviceTimeZone());
  const top = useTopDay(rows, query.hasNextPage);
  return (
    <CellFrames.Provider value={top.frame}>
      <View style={{ flex: 1 }}>
        <FlatList
          ref={list}
          testID="message-list"
          inverted
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 4 }}
          data={rows}
          keyExtractor={(m) => m.id}
          extraData={`${lit ?? ''}|${today}`}
          onScrollToIndexFailed={onScrollToIndexFailed}
          renderItem={renderItem}
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
        <FloatingDay label={top.label} opacity={top.opacity} onChip={top.onChip} />
      </View>
    </CellFrames.Provider>
  );
}
