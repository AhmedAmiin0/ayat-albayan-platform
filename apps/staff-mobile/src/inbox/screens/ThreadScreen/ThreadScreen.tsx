import { sessionWindowOpen, type ThreadView } from '@ab/shared';
import { formatPhone } from '@ab/core';
import { useLocalSearchParams } from 'expo-router';
import { backWithin } from '@/core/nav/back-within';
import { useHolds, t, ErrorState, KeyboardFrame, ltr, Screen, Avatar, useNow } from '@ab/mobile-kit';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { ChatActionsProvider } from '@/inbox/thread/components/ChatActionsProvider';
import { ChatHeader } from '@/inbox/thread/components/ChatHeader';
import { ChatNotice } from '@/inbox/thread/components/ChatNotice';
import { CallButton } from '@/inbox/thread/calls/entries/CallButton';
import { Composer } from '@/inbox/composer/Composer';
import { clockAt, kindLabel } from '@/inbox/shared/format';
import { MessageList } from '@/inbox/messages/components/MessageList';
import { ReplyActionsProvider } from '@/inbox/messages/reply-actions';
import { OwnThreadNote } from '@/inbox/thread/components/OwnThreadNote';
import { SalesChatActions } from '@/inbox/leads/sales/SalesChatActions';
import { SendRating } from '@/inbox/rating/SendRating';
import { SubscriptionPanel } from '@/inbox/subscription/SubscriptionPanel';
import { ThreadHeaderActions } from '@/inbox/thread/components/ThreadHeaderActions';
import { ChatSearchButton } from '@/inbox/thread/search';
import { useHeaderStudents } from '@/inbox/thread/components/HeaderStudents';
import { isOwnThread, threadBase, useThreadMode, type ThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { useInboxRead } from '@/inbox/thread/hooks/inbox-sync';
import { useThread } from '@/inbox/thread/hooks/use-thread';
import { useLastMessageLine } from '@/inbox/thread/hooks/use-last-message';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import type { ThreadLesson } from '@ab/shared';
import type { ClockCycle } from '@ab/time';

type ThreadQuery = ReturnType<typeof useThread>;

const NO_LESSONS: ThreadLesson[] = [];

/**
 * The phone icon: only once the chat is loaded (no flash), never in a teacher's own chat (docs/28).
 */
const callable = (mode: ThreadMode, thread: ThreadView | null): boolean =>
  thread !== null && !isOwnThread(mode, thread);

/** The contact's initials (contacts never carry a photo), toned by the number as in the list. */
const contactAvatar = (thread: ThreadView | null, phone: string) => (
  <Avatar name={thread?.display_name ?? ''} id={phone} decorative />
);

/** Offline: when the saved thread was fetched. Else who the number is, then the number if named. */
function subtitleOf(
  phone: string,
  query: ThreadQuery,
  who: { teacher: boolean; cycle: ClockCycle; tz: string },
): string {
  const { teacher, cycle, tz } = who;
  if (query.isError && query.dataUpdatedAt > 0) {
    return t.mobile.lastUpdated.replace('{time}', clockAt(query.dataUpdatedAt, cycle, tz));
  }
  const thread = query.data?.pages[0]?.thread;
  return thread?.display_name && !teacher
    ? `${kindLabel(thread)} · ${ltr(formatPhone(phone))}`
    : kindLabel(thread);
}

/** R-MOB-02, R-MSG-05, R-MOB-03: teachers get no subscription panel and a read-only own chat. */
export function ThreadScreen() {
  const now = useNow();
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const { phone = '' } = useLocalSearchParams<{ phone?: string }>();
  const mode = useThreadMode();
  const base = useTreeBase();
  const teacher = mode.kind === 'teacher';
  const sales = useHolds('self.sales');
  const query = useThread(phone);
  // Opening the chat reads it on the server: its unread badge leaves the list at once.
  useInboxRead(phone, query);
  const thread = query.data?.pages[0]?.thread ?? null;
  const lastMessage = useLastMessageLine(thread?.last_inbound_at);
  // Pushed from the tabs, back pops the whole chat group; a cold start on the chat opens its list.
  const title = thread?.display_name ?? (teacher ? kindLabel(thread) : ltr(formatPhone(phone)));
  const call = <CallButton phone={phone} name={title} canSend={callable(mode, thread)} />;
  const students = useHeaderStudents(mode.kind === 'admin' ? (query.data?.pages[0]?.people?.students ?? []) : []);
  const back = () => backWithin(inTree(base, threadBase(mode)));
  return (
    // Reply and forward state belongs to this chat; another chat starts clean.
    <ChatActionsProvider key={phone} phone={phone} thread={thread}>
      <Screen chat>
        <ChatHeader
          title={title}
          subtitle={subtitleOf(phone, query, { teacher, cycle, tz })}
          status={lastMessage}
          onBack={back}
          avatar={contactAvatar(thread, phone)}
          onTitlePress={students.onPress}
          trailing={
            mode.kind === 'admin' ? (
              <>
                {call}
                <ThreadHeaderActions phone={phone} data={query.data} sales={sales} />
              </>
            ) : (
              <>{call}<ChatSearchButton /></>
            )
          }
        />
        {students.sheet}
        {mode.kind !== 'admin' ? null : sales ? (
          <SalesChatActions thread={thread} />
        ) : (
          <SubscriptionPanel data={query.data} phone={phone} />
        )}
        {query.data ? (
          // Composer, quote strip and staged file stay on the keyboard (Android).
          <KeyboardFrame style={{ flex: 1, gap: 4 }}>
            <ReplyActionsProvider
              phone={phone}
              lessons={query.data.pages[0]?.lessons ?? NO_LESSONS}
            >
              <MessageList phone={phone} query={query} />
            </ReplyActionsProvider>
            <ChatNotice />
            {mode.kind === 'admin' &&
            thread?.guardian_id &&
            !sessionWindowOpen(thread.last_inbound_at, now) ? (
              <SendRating thread={thread} />
            ) : null}
            {isOwnThread(mode, thread) ? (
              <OwnThreadNote />
            ) : (
              <Composer
                phone={phone}
                thread={thread}
                lessons={query.data.pages[0]?.lessons ?? []}
                student={query.data.pages[0]?.people?.students[0]?.name ?? null}
                fresh={query.isFetchedAfterMount && thread === null}
              />
            )}
          </KeyboardFrame>
        ) : query.isError ? (
          <ErrorState onRetry={() => void query.refetch()} />
        ) : null}
      </Screen>
    </ChatActionsProvider>
  );
}
