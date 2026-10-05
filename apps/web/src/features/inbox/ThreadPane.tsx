import { threadBadge } from '@ab/shared';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { Toast } from '@/components/ui/toast';
import { teacherMeQuery } from '@/features/teacher/api';
import { templatesQuery } from '@/features/templates/api';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { leadByPhoneQuery, threadQuery } from './api';
import { Composer } from './Composer';
import { LeadPanel, type LeadNotice } from './LeadPanel';
import { MessageLog } from './MessageLog';
import { useInboxMode } from './mode';
import type { InboxSearch } from './search';
import { SubscribePanel } from './SubscribePanel';
import { sendErrorText } from './TextComposer';
import { ThreadHeader } from './ThreadHeader';

export interface ThreadPaneProps {
  phone: string;
  listSearch: InboxSearch;
}

/**
 * One conversation (R-LEAD-02, R-MSG-05, R-SUB-01): the message log, the reply box and beside it
 * (below it under 1280px) the lead's qualification panel, or the guardian's children and packages.
 * Teacher mode: the log and the reply box only; their own chat with the academy is read-only.
 */
export function ThreadPane({ phone, listSearch }: ThreadPaneProps) {
  const queryClient = useQueryClient();
  const headingId = useId();
  // The lead panel's toasts live here: «تسجيل الطالب» turns the aside into the family's panel.
  const [notice, setNotice] = useState<LeadNotice | null>(null);
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
  if (!th) return <EmptyState title={t.inbox.noThread} />;
  const messages = [...detail.data.pages].reverse().flatMap((p) => p.messages);
  const waiting = new Set((templates.data ?? []).filter((x) => x.status !== 'approved').map((x) => x.key));
  const context = {
    studentName: lead.data?.qualification.student_name ?? null,
    teacherName: th.teacher_name,
    lessons: detail.data.pages[0]?.lessons ?? [],
  };
  const people = admin ? (detail.data.pages[0]?.people ?? null) : null;
  const aside = isLead || !!people?.guardian;
  // Until /teachers/me answers, a teacher's number counts as their own (no composer).
  const ownThread = teacherMode && !!th.teacher_id && (!me.data || me.data.id === th.teacher_id);

  return (
    <section aria-labelledby={headingId} className="min-w-0 shell:flex shell:h-full shell:min-h-0 shell:flex-col">
      <ThreadHeader thread={th} listSearch={listSearch} headingId={headingId} badge={people && threadBadge(people)} />
      <div
        className={cn(
          'grid gap-6 shell:min-h-0 shell:flex-1',
          aside
            ? 'shell:grid-rows-[minmax(0,3fr)_minmax(0,2fr)] xl:grid-cols-[minmax(0,1fr)_340px] xl:grid-rows-[minmax(0,1fr)]'
            : 'shell:grid-rows-[minmax(0,1fr)]',
        )}
      >
        {/* The log scrolls, the reply box stays pinned under it. */}
        <div className="min-w-0 shell:flex shell:min-h-0 shell:flex-col">
          <MessageLog
            messages={messages}
            hasMore={detail.hasNextPage}
            loadingOlder={detail.isFetchingNextPage}
            onOlder={() => void detail.fetchNextPage()}
            waitingKeys={waiting}
          />
          {ownThread ? (
            <p className="mt-4 shrink-0 border-t border-rule pt-4 text-sm text-ink-2">{t.inbox.ownThreadReadOnly}</p>
          ) : (
            <Composer key={phone} thread={th} context={context} />
          )}
        </div>
        {isLead && <LeadPanel phone={phone} onNotice={setNotice} />}
        {people?.guardian && <SubscribePanel people={people} />}
      </div>
      {notice && <Toast {...notice} onDismiss={() => setNotice(null)} />}
    </section>
  );
}
