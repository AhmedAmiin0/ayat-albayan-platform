import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { templatesQuery } from '@/features/templates/api';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { leadByPhoneQuery, threadQuery } from './api';
import { Composer } from './Composer';
import { LeadPanel } from './LeadPanel';
import { MessageLog } from './MessageLog';
import type { InboxSearch } from './search';
import { sendErrorText } from './TextComposer';
import { ThreadHeader } from './ThreadHeader';

export interface ThreadPaneProps {
  phone: string;
  listSearch: InboxSearch;
}

/**
 * One conversation (R-LEAD-02, R-MSG-05): the message log, the reply box and, for a lead, the
 * qualification panel beside it (below it under 1280px).
 */
export function ThreadPane({ phone, listSearch }: ThreadPaneProps) {
  const queryClient = useQueryClient();
  const headingId = useId();
  const detail = useInfiniteQuery(threadQuery(phone));
  const templates = useQuery(templatesQuery);
  const th = detail.data?.pages[0]?.thread ?? null;
  const isLead = !!th?.lead_id && !th.guardian_id && !th.teacher_id;
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
  const context = { studentName: lead.data?.qualification.student_name ?? null, teacherName: th.teacher_name };

  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <ThreadHeader thread={th} listSearch={listSearch} headingId={headingId} />
      <div className={cn('grid gap-6', isLead && 'xl:grid-cols-[minmax(0,1fr)_280px]')}>
        <div className="min-w-0">
          <MessageLog
            messages={messages}
            hasMore={detail.hasNextPage}
            loadingOlder={detail.isFetchingNextPage}
            onOlder={() => void detail.fetchNextPage()}
            waitingKeys={waiting}
          />
          <Composer key={phone} thread={th} context={context} />
        </div>
        {isLead && <LeadPanel phone={phone} />}
      </div>
    </section>
  );
}
