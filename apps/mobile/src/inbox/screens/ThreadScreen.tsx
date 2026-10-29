import { formatPhone, sessionWindowOpen, type ThreadView } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useHolds } from '@/auth';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { KeyboardFrame } from '@/core/ui/layout/KeyboardFrame';
import { ltr } from '@/core/ui/primitives/Ltr';
import { Screen } from '@/core/ui/layout/Screen';
import { ChatActionsProvider } from '../thread/components/ChatActionsProvider';
import { ChatHeader } from '../thread/components/ChatHeader';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { ChatNotice } from '../thread/components/ChatNotice';
import { CallButton } from '../thread/calls/entries/CallButton';
import { Composer } from '../composer/Composer';
import { clockAt, kindLabel } from '../shared/format';
import { MessageList } from '../messages/components/MessageList';
import { ReplyActionsProvider } from '../messages/reply-actions';
import { OwnThreadNote } from '../thread/components/OwnThreadNote';
import { SalesChatActions } from '../leads/sales/SalesChatActions';
import { SendRating } from '../rating/SendRating';
import { SubscriptionPanel } from '../subscription/SubscriptionPanel';
import { ThreadHeaderActions } from '../thread/components/ThreadHeaderActions';
import { useHeaderStudents } from '../thread/components/HeaderStudents';
import { isOwnThread, threadBase, useThreadMode, type ThreadMode } from '../thread/hooks/thread-mode';
import { useInboxRead } from '../thread/hooks/inbox-sync';
import { useThread } from '../thread/hooks/use-thread';
import { useClockCycle } from '@/core/lib/clock';
import type { ClockCycle, ThreadLesson } from '@ab/shared';

type ThreadQuery = ReturnType<typeof useThread>;

const NO_LESSONS: ThreadLesson[] = [];

/** The phone icon: only once the chat is loaded (no flash), never in a teacher's own chat (docs/28). */
const callable = (mode: ThreadMode, thread: ThreadView | null): boolean =>
  thread !== null && !isOwnThread(mode, thread);

/** The contact's initials (contacts never carry a photo), toned by the number as in the list. */
const contactAvatar = (thread: ThreadView | null, phone: string) => (
  <Avatar name={thread?.display_name ?? ''} id={phone} decorative />
);

/** Offline: when the saved thread was fetched. Else who the number is, then the number if named. */
function subtitleOf(phone: string, query: ThreadQuery, who: { teacher: boolean; cycle: ClockCycle }): string {
  const { teacher, cycle } = who;
  if (query.isError && query.data) {
    return t.mobile.lastUpdated.replace('{time}', clockAt(query.dataUpdatedAt, cycle));
  }
  const thread = query.data?.pages[0]?.thread;
  return thread?.display_name && !teacher
    ? `${kindLabel(thread)} · ${ltr(formatPhone(phone))}`
    : kindLabel(thread);
}

/**
 * One WhatsApp conversation (R-MOB-02, R-MSG-05): GET /threads/:phone oldest → newest with each
 * of our rows' status word, «رسايل أقدم» to page back, pull to refresh, and the composer. Offline
 * it shows the saved thread and when it was fetched (R-MOB-03). Opened from a lead or a push.
 * Over the messages: whether the family is subscribed, and the button to subscribe (R-SUB-01).
 * A teacher (R-TCH-03) gets no subscription panel, and her own chat with the academy is read-only.
 * A salesperson (self.sales, docs/16) gets no panel: on her family's chat «اشتراك جديد» / «سجّل تحويلًا بنكيًا»
 * (SalesChatMoney, R-ASST-01/04); her header's «⋮» has «تسجيل طالب جديد» first on a lead's chat (owner
 * 2026-10-30) and «تحقق من التسجيل» for this number (students.check_registration). Admin and assistant
 * headers get «القوائم» with inbox.lists (docs/22: the chat's lists; never a teacher's).
 * Room to read (owner 2026-10-18), the same in every tree: a full screen above the tabs (its tree's
 * chat group, owner 2026-10-24: a hidden tab bar still took the bottom touches, react-native-screens#4132),
 * a one-line header, the family's sales actions in one row of pills, and a one-row composer.
 */
export function ThreadScreen() {
  const cycle = useClockCycle();
  const { phone = '' } = useLocalSearchParams<{ phone: string }>();
  const mode = useThreadMode();
  const base = useTreeBase();
  const teacher = mode.kind === 'teacher';
  const sales = useHolds('self.sales');
  const query = useThread(phone);
  // Opening the chat reads it on the server: its unread badge leaves the list at once.
  useInboxRead(phone, query);
  const thread = query.data?.pages[0]?.thread ?? null;
  // Pushed from the tabs, back pops the whole chat group; a cold start on the chat opens its list.
  const title = thread?.display_name ?? (teacher ? kindLabel(thread) : ltr(formatPhone(phone)));
  const call = <CallButton phone={phone} name={title} canSend={callable(mode, thread)} />;
  const students = useHeaderStudents(mode.kind === 'admin' ? (query.data?.pages[0]?.people?.students ?? []) : []);
  const back = () =>
    router.canGoBack() ? router.back() : router.replace(inTree(base, threadBase(mode)));
  return (
    // «رد» / «إعادة توجيه» (owner 2026-10-25): its state is this chat's; another chat starts clean.
    <ChatActionsProvider key={phone} phone={phone} thread={thread}>
      <Screen chat>
        <ChatHeader
          title={title}
          subtitle={subtitleOf(phone, query, { teacher, cycle })}
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
              call
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
          // Composer, quote strip and staged file stay on the keyboard (owner 2026-10-25, Android).
          <KeyboardFrame style={{ flex: 1, gap: 4 }}>
            <ReplyActionsProvider phone={phone} lessons={query.data.pages[0]?.lessons ?? NO_LESSONS}>
              <MessageList phone={phone} query={query} />
            </ReplyActionsProvider>
            <ChatNotice />
            {mode.kind === 'admin' &&
            thread?.guardian_id &&
            !sessionWindowOpen(thread.last_inbound_at, new Date()) ? (
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
