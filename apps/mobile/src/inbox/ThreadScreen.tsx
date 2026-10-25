import { formatPhone, sessionWindowOpen } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useHolds } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/nav/tree-base';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { KeyboardFrame } from '@/core/ui/layout/KeyboardFrame';
import { ltr } from '@/core/ui/primitives/Ltr';
import { Screen } from '@/core/ui/layout/Screen';
import { ChatActionsProvider } from './ChatActionsProvider';
import { ChatHeader } from './ChatHeader';
import { ChatNotice } from './ChatNotice';
import { Composer } from './Composer';
import { clockAt, kindLabel } from './format';
import { MessageList } from './MessageList';
import { OwnThreadNote } from './OwnThreadNote';
import { SalesChatActions } from './SalesChatActions';
import { SendRating } from './rating/SendRating';
import { SubscriptionPanel } from './subscription/SubscriptionPanel';
import { ThreadHeaderActions } from './ThreadHeaderActions';
import { isOwnThread, threadBase, useThreadMode } from './thread-mode';
import { useThread } from './use-thread';

type ThreadQuery = ReturnType<typeof useThread>;

/** Offline: when the saved thread was fetched. Else who the number is, then the number if named. */
function subtitleOf(phone: string, query: ThreadQuery, teacher: boolean): string {
  if (query.isError && query.data) {
    return t.mobile.lastUpdated.replace('{time}', clockAt(query.dataUpdatedAt));
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
 * A salesperson (self.sales, docs/16) gets «تسجيل طالب جديد» on a lead's chat instead of the panel,
 * and on her family's chat «اشتراك جديد» / «سجّل تحويلًا بنكيًا» (SalesChatMoney, R-ASST-01/04); her header
 * has «تحقق من التسجيل» for this number (students.check_registration). Admin and assistant headers
 * get «القوائم» with inbox.lists (docs/22: the chat's lists; never a teacher's).
 * Room to read (owner 2026-10-18), the same in every tree: a full screen above the tabs (its tree's
 * chat group, owner 2026-10-24: a hidden tab bar still took the bottom touches, react-native-screens#4132),
 * a one-line header, the sales actions in one row of pills, and a one-row composer.
 */
export function ThreadScreen() {
  const { phone = '' } = useLocalSearchParams<{ phone: string }>();
  const mode = useThreadMode();
  const base = useTreeBase();
  const teacher = mode.kind === 'teacher';
  const sales = useHolds('self.sales');
  const query = useThread(phone);
  const thread = query.data?.pages[0]?.thread ?? null;
  // Pushed from the tabs, back pops the whole chat group; a cold start on the chat opens its list.
  const back = () =>
    router.canGoBack() ? router.back() : router.replace(inTree(base, threadBase(mode)));
  return (
    // «رد» / «إعادة توجيه» (owner 2026-10-25): its state is this chat's; another chat starts clean.
    <ChatActionsProvider key={phone} phone={phone} thread={thread}>
      <Screen chat>
        <ChatHeader
          title={thread?.display_name ?? (teacher ? kindLabel(thread) : ltr(formatPhone(phone)))}
          subtitle={subtitleOf(phone, query, teacher)}
          onBack={back}
          trailing={
            mode.kind === 'admin' ? (
              <ThreadHeaderActions phone={phone} data={query.data} sales={sales} />
            ) : null
          }
        />
        {mode.kind !== 'admin' ? null : sales ? (
          <SalesChatActions thread={thread} />
        ) : (
          <SubscriptionPanel data={query.data} phone={phone} />
        )}
        {query.data ? (
          // Composer, quote strip and staged file stay on the keyboard (owner 2026-10-25, Android).
          <KeyboardFrame style={{ flex: 1, gap: 4 }}>
            <MessageList phone={phone} query={query} />
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
