import { threadBadge } from '@ab/shared';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useState } from 'react';
import { FormAlert } from '@/components/ui/form-alert';
import { Toast } from '@/components/ui/toast';
import { usePhone } from '@/components/ui/use-narrow';
import { teacherMeQuery } from '@/features/teacher/api';
import { templatesQuery } from '@/features/templates/api';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { leadByPhoneQuery, threadQuery } from './api';
import { Composer } from './Composer';
import { LeadPanel, type LeadNotice } from './LeadPanel';
import { MessageLog } from './MessageLog';
import { NewThread } from './NewThread';
import { PhoneChat } from './PhoneChat';
import { useInboxMode } from './mode';
import { SalesChatActions } from './sales-money/SalesChatActions';
import type { InboxSearch } from './search';
import { SubscribePanel } from './SubscribePanel';
import { sendErrorText } from './TextComposer';
import { ThreadHeader } from './ThreadHeader';
import { ThreadHeaderPhone } from './ThreadHeaderPhone';
import { ThreadSideSheet } from './ThreadSideSheet';

export interface ThreadPaneProps {
  phone: string;
  listSearch: InboxSearch;
}

/**
 * One conversation (R-LEAD-02, R-MSG-05, R-SUB-01): the log, the reply box and beside it (below it under
 * 1280px) the lead's panel or the family's packages; sales gets its chat actions in the header instead.
 * Teacher mode: the log and the reply box only; their own chat with the academy is read-only. Phones
 * (< 640px): a full-screen chat; the panel is a full-screen sheet opened from the header's icon button.
 */
export function ThreadPane({ phone, listSearch }: ThreadPaneProps) {
  const queryClient = useQueryClient();
  const headingId = useId();
  // The lead panel's toasts live here (after «تسجيل الطالب» the aside becomes the family's panel).
  const [notice, setNotice] = useState<LeadNotice | null>(null);
  const phoneView = usePhone();
  const [sheet, setSheet] = useState(false);
  const detail = useInfiniteQuery(threadQuery(phone));
  const templates = useQuery(templatesQuery);
  const th = detail.data?.pages[0]?.thread ?? null;
  const admin = useInboxMode() === 'admin';
  const teacherMode = useInboxMode() === 'teacher';
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
  if (detail.isError) return <FormAlert>{sendErrorText(detail.error)}</FormAlert>;
  if (!th) return <NewThread phone={phone} lessons={detail.data.pages[0]?.lessons ?? []} />;
  const messages = [...detail.data.pages].reverse().flatMap((p) => p.messages);
  const waiting = new Set((templates.data ?? []).filter((x) => x.status !== 'approved').map((x) => x.key));
  const context = {
    studentName: lead.data?.qualification.student_name ?? null,
    teacherName: th.teacher_name,
    lessons: detail.data.pages[0]?.lessons ?? [],
  };
  const people = admin ? (detail.data.pages[0]?.people ?? null) : null;
  const panel = isLead || !!people?.guardian;
  const aside = panel && !phoneView;
  const side = (
    <>
      {isLead && <LeadPanel phone={phone} onNotice={setNotice} />}
      {people?.guardian && <SubscribePanel people={people} />}
    </>
  );
  const sheetLabel = isLead ? t.inbox.leadSheet : t.inbox.subscriptionSheet;
  const sheetOpen = sheet && panel && phoneView;
  const toast = notice && <Toast {...notice} onDismiss={() => setNotice(null)} />; // inside an open phone sheet
  // Until /teachers/me answers, a teacher's number counts as their own (no composer).
  const ownThread = teacherMode && !!th.teacher_id && (!me.data || me.data.id === th.teacher_id);

  const headerProps = { thread: th, listSearch, headingId, badge: people && threadBadge(people) };
  const register = <SalesChatActions thread={th} />;
  const log = (fill: 'shell' | 'xl' | 'phone') => (
    <MessageLog
      messages={messages}
      hasMore={detail.hasNextPage}
      loadingOlder={detail.isFetchingNextPage}
      onOlder={() => void detail.fetchNextPage()}
      waitingKeys={waiting}
      fill={fill}
    />
  );
  const reply = ownThread ? (
    <p className="mt-4 shrink-0 border-t border-rule pt-4 text-sm text-ink-2 max-sm:mt-0 max-sm:px-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:pt-3">
      {t.inbox.ownThreadReadOnly}
    </p>
  ) : (
    <Composer key={phone} thread={th} context={context} />
  );

  if (phoneView) {
    return (
      <PhoneChat labelledBy={headingId}>
        <ThreadHeaderPhone
          {...headerProps}
          action={
            panel ? (
              <ThreadSideSheet compact label={sheetLabel} open={sheet} onOpenChange={setSheet}>
                {side}
                {sheetOpen && toast}
              </ThreadSideSheet>
            ) : (
              register
            )
          }
        />
        {log('phone')}
        {reply}
        {!sheetOpen && toast}
      </PhoneChat>
    );
  }

  return (
    <section aria-labelledby={headingId} className="min-w-0 shell:flex shell:h-full shell:min-h-0 shell:flex-col">
      <ThreadHeader {...headerProps} action={register} />
      <div
        className={cn(
          'grid gap-6 shell:min-h-0 shell:flex-1',
          // With the side panel: one scrolling column below 1280px, three columns from it.
          aside
            ? 'shell:overflow-y-auto shell:overscroll-contain xl:grid-cols-[minmax(0,1fr)_340px] xl:grid-rows-[minmax(0,1fr)] xl:overflow-visible'
            : 'shell:grid-rows-[minmax(0,1fr)]',
        )}
      >
        {/* The log scrolls, the reply box stays pinned under it. */}
        <div className={cn('min-w-0', aside ? 'xl:flex xl:min-h-0 xl:flex-col' : 'shell:flex shell:min-h-0 shell:flex-col')}>
          {log(aside ? 'xl' : 'shell')}
          {reply}
        </div>
        {aside && side}
      </div>
      {toast}
    </section>
  );
}
