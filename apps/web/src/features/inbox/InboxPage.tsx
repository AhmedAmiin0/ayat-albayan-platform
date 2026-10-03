import { useQuery } from '@tanstack/react-query';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHead } from '@/components/ui/page';
import { Pager } from '@/components/ui/pager';
import { rail } from '@/components/ui/rail';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { threadsQuery } from './api';
import { useInboxMode } from './mode';
import { parseInboxSearch, type InboxSearch } from './search';
import { ThreadList } from './ThreadList';
import { ThreadPane } from './ThreadPane';

export interface InboxPageProps {
  search: InboxSearch;
  onSearch: (next: InboxSearch) => void;
}

/**
 * /admin/inbox (R-LEAD-02): every WhatsApp conversation, newest first, beside the open thread.
 * /teacher/inbox (teacher mode): the same page over the teacher's own families only (API-scoped).
 * Under 900px the list and the thread are separate screens (the thread has «رجوع»).
 */
export function InboxPage({ search, onSearch }: InboxPageProps) {
  const threads = useQuery(threadsQuery(search));
  const mode = useInboxMode();
  const { phone, ...listSearch } = search;
  const filter = (patch: Record<string, unknown>) =>
    onSearch(parseInboxSearch({ ...search, ...patch, page: 1 }));

  return (
    <>
      <PageHead>
        <Cartouche>{mode !== 'admin' ? t.nav.conversations : t.inbox.title}</Cartouche>
        {threads.data && (
          <span className="text-sm text-ink-3 tabular-nums">
            {t.leads.count.replace('{n}', String(threads.data.total))}
          </span>
        )}
      </PageHead>
      <div className="grid gap-[22px] shell:grid-cols-[320px_minmax(0,1fr)]">
        <div
          className={cn(
            'min-w-0 transition-opacity duration-[120ms]',
            rail,
            phone && 'max-shell:hidden',
            threads.isPlaceholderData && 'opacity-60',
          )}
          aria-busy={threads.isPlaceholderData || undefined}
        >
          {threads.isError && <p role="alert">{t.common.error}</p>}
          {threads.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
          {threads.data && (
            <>
              <ThreadList search={search} threads={threads.data.items} onFilter={filter} />
              <Pager
                page={search.page}
                total={threads.data.total}
                pageSize={threads.data.pageSize}
                onPage={(page) => onSearch({ ...search, page })}
              />
            </>
          )}
        </div>
        {phone ? (
          <ThreadPane key={phone} phone={phone} listSearch={listSearch} />
        ) : (
          <EmptyState title={t.inbox.pickThread} className="self-start max-shell:hidden">
            {t.inbox.pickThreadHint}
          </EmptyState>
        )}
      </div>
    </>
  );
}
