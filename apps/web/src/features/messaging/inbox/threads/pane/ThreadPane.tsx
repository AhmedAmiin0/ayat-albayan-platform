import { threadBadge } from '@ab/shared';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Toast } from '@/components/ui/overlay/toast';
import { useBelowShell } from '@/components/ui/layout/use-narrow';
import { teacherMeQuery } from '@/features/teaching/teacher/api';
import { templatesQuery } from '@/features/messaging/templates/api';
import { t } from '@/lib/i18n/i18n';
import { leadByPhoneQuery, threadQuery } from '../../api/api';
import { useLiveChat } from '../../api/live';
import { ChatActionsProvider } from '../../shared/ChatActionsProvider';
import { Composer } from '../../composer/components/Composer';
import { LeadPanel, type LeadNotice } from '../../lead/LeadPanel';
import { MessageLog } from '../../messages/components/MessageLog';
import { NewThread } from './NewThread';
import { PhoneChat } from './PhoneChat';
import { useInboxMode } from '../../shared/mode';
import { readErrorText } from './read-error';
import { SalesChatFrame } from '../../sales-money/SalesChatFrame';
import { SalesFamilyLine } from '../../sales/SalesFamilyLine';
import type { InboxSearch } from '../../shared/search';
import { SubscribePanel } from '../../sales/SubscribePanel';
import { ThreadHeader } from './ThreadHeader';
import { ThreadHeaderPhone } from './ThreadHeaderPhone';
import { ThreadPaneWide } from './ThreadPaneWide';
import { ThreadSideSheet } from './ThreadSideSheet';
import { useChatAccess } from '../../shared/use-chat-access';
import { useWindowFocus } from './use-window-focus';

export interface ThreadPaneProps {
  phone: string;
  listSearch: InboxSearch;
}

/**
 * One conversation (R-LEAD-02, R-MSG-05, R-SUB-01): the log, the reply box and beside it (below it under
 * 1280px) the lead's panel or the family's packages; sales gets its chat actions and children line in the
 * header instead. Teacher mode: the log and the reply box only; their own chat with the academy is
 * read-only. Below 900px: a full-screen chat; the panel is a full-screen sheet opened from the header. The
 * sales actions' dialogs sit above that switch (SalesChatFrame), so crossing 900px keeps them.
 */
export function ThreadPane({ phone, listSearch }: ThreadPaneProps) {
  const queryClient = useQueryClient();
  const headingId = useId();
  // The lead panel's toasts live here (after «تسجيل الطالب» the aside becomes the family's panel).
  const [notice, setNotice] = useState<LeadNotice | null>(null);
  const phoneView = useBelowShell();
  const [sheet, setSheet] = useState(false);
  const mode = useInboxMode();
  const access = useChatAccess(mode);
  const detail = useInfiniteQuery(threadQuery(phone));
  // Back to this window: fetch now, which also re-arms the focus-gated poll (W13).
  useWindowFocus(detail.refetch, phone);
  useLiveChat(phone); // realtime re-reads it on a change (docs/12 §15)
  const templates = useQuery({ ...templatesQuery, enabled: access.templates });
  const th = detail.data?.pages[0]?.thread ?? null;
  const admin = mode === 'admin';
  const teacherMode = mode === 'teacher';
  const me = useQuery({ ...teacherMeQuery, enabled: teacherMode });
  // /leads is the admin's: never asked in teacher mode (the API also nulls lead_id there).
  const isLead = admin && !!th?.lead_id && !th.guardian_id && !th.teacher_id;
  const lead = useQuery({ ...leadByPhoneQuery(phone), enabled: isLead });
  const loaded = detail.isSuccess;
  // Opening the thread marks their messages read (H2): refresh the unread counts (list + fihris).
  useEffect(() => {
    if (!loaded) return;
    void queryClient.invalidateQueries({ queryKey: ['threads'], predicate: (q) => q.queryKey[1] !== 'detail' });
  }, [loaded, phone, queryClient]);

  if (detail.isPending) return <p className="text-sm text-ink-3">{t.common.loading}</p>;
  // A failed background poll (data kept) does not blank the chat: the log shows a status line instead.
  if (detail.isError && !detail.data) return <FormAlert>{readErrorText(detail.error)}</FormAlert>;
  const first = detail.data.pages[0];
  if (!th) return <NewThread phone={phone} lessons={first?.lessons ?? []} />;
  const messages = [...detail.data.pages].reverse().flatMap((p) => p.messages);
  const waiting = new Set((templates.data ?? []).filter((x) => x.status !== 'approved').map((x) => x.key));
  const context = { studentName: lead.data?.qualification.student_name ?? null, firstStudentName: first?.people.students[0]?.name ?? null, teacherName: th.teacher_name, lessons: first?.lessons ?? [] };
  // Sales keeps the children for its header line; their packages arrive nulled, so no badge (admin only).
  const people = teacherMode ? null : (first?.people ?? null);
  const family = admin && people?.guardian ? people : null;
  const panel = isLead || !!family;
  const aside = panel && !phoneView;
  const side = (
    <>
      {isLead && <LeadPanel phone={phone} onNotice={setNotice} />}
      {family && <SubscribePanel people={family} />}
    </>
  );
  const sheetLabel = isLead ? t.inbox.leadSheet : t.inbox.subscriptionSheet;
  const sheetOpen = sheet && panel && phoneView;
  const toast = notice && <Toast {...notice} onDismiss={() => setNotice(null)} />; // inside an open phone sheet
  // Until /teachers/me answers, a teacher's number counts as their own (no composer).
  const ownThread = teacherMode && !!th.teacher_id && (!me.data || me.data.id === th.teacher_id);
  const line = mode === 'sales' && people && <SalesFamilyLine phone={phone} people={people} lessons={first?.lessons ?? []} />;
  const readOnly = ownThread ? t.inbox.ownThreadReadOnly : access.send ? null : t.inbox.sendNotAllowed;
  const headerProps = { thread: th, listSearch, headingId, badge: admin && people ? threadBadge(people) : null, line, lists: first?.lists, callable: !readOnly };
  const log = (fill: 'shell' | 'xl' | 'phone') => (
    <>
      {detail.isError && (
        <p role="status" className="shrink-0 px-3 py-1 text-xs text-danger shell:px-0">
          {t.common.error}
        </p>
      )}
      <MessageLog
        phone={phone}
        messages={messages}
        hasMore={detail.hasNextPage}
        loadingOlder={detail.isFetchingNextPage}
        onOlder={() => void detail.fetchNextPage()}
        waitingKeys={waiting}
        fill={fill}
        canCall={!readOnly}
      />
    </>
  );
  const reply = readOnly ? (
    <p className="mt-4 shrink-0 border-t border-rule pt-4 text-sm text-ink-2 max-shell:mt-0 max-shell:px-3 max-shell:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-shell:pt-3">
      {readOnly}
    </p>
  ) : (
    <Composer key={phone} thread={th} context={context} />
  );
  const body = (actions: ReactNode) =>
    phoneView ? (
      <PhoneChat labelledBy={headingId}>
        <ThreadHeaderPhone
          {...headerProps}
          action={
            <>
              {panel && (
                <ThreadSideSheet compact label={sheetLabel} open={sheet} onOpenChange={setSheet}>
                  {side}
                  {sheetOpen && toast}
                </ThreadSideSheet>
              )}
              {actions}
            </>
          }
        />
        {log('phone')}
        {reply}
        {!sheetOpen && toast}
      </PhoneChat>
    ) : (
      <ThreadPaneWide labelledBy={headingId} header={<ThreadHeader {...headerProps} action={actions} />} log={log(aside ? 'xl' : 'shell')} reply={reply} aside={aside} side={side} toast={toast} />
    );
  const frame = <SalesChatFrame key={phone} thread={th} lists={first?.lists} compact={phoneView}>{body}</SalesChatFrame>;
  return <ChatActionsProvider thread={th} enabled={!readOnly && !teacherMode}>{frame}</ChatActionsProvider>;
}
