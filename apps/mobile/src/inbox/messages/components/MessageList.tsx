import { senderLine } from '@ab/shared';
import { useEffect, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { callerName } from '../../thread/calls/entries/call-text';
import { CallEntry } from '../../thread/calls/entries/CallEntry';
import { logRows, type LogRow } from '../../thread/calls/entries/log-rows';
import { useThreadCalls } from '../../thread/calls/entries/use-thread-calls';
import { useCalls } from '../../thread/calls/state/call-context';
import { messageGap } from '../hooks/list-gap';
import { MessageBubble } from './MessageBubble';
import { threadMessages } from '../../thread/hooks/thread-cache';
import { useJump } from '../../thread/hooks/use-jump';
import { useThreadMode } from '../../thread/hooks/thread-mode';
import type { useThread } from '../../thread/hooks/use-thread';

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
  const list = useRef<FlatList<LogRow>>(null);
  // Her own pull only: a background refetch (open, send, push) must not spin over the newest bubble.
  const [pulling, setPulling] = useState(false);
  // Calls merged in by time (docs/28 §5); none while calls are off.
  const calls = useThreadCalls(phone);
  const ui = useCalls();
  const teacher = useThreadMode().kind === 'teacher';
  const rows = logRows(threadMessages(query.data), { calls, hasMore: query.hasNextPage });
  const newest = rows[0]?.message;
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
          {item.message ? (
            <MessageBubble message={item.message} phone={phone} onJump={jump} highlight={lit === item.id} />
          ) : item.call ? (
            <CallEntry call={item.call} onCallBack={ui && !ui.busy ? () => ui.call({ phone, name: callerName(item.call ?? { display_name: null, phone_e164: phone }, !teacher) }) : undefined} />
          ) : null}
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
