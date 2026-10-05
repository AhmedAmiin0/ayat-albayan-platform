import type { ThreadView } from '@ab/shared';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { t } from '@/lib/i18n';
import type { InboxSearch } from './search';
import { ThreadListControls } from './ThreadListControls';
import { ThreadRow } from './ThreadRow';

export interface ThreadListProps {
  search: InboxSearch;
  threads: ThreadView[];
  /** A filter patch; the page resets to 1 and blank values drop (parseInboxSearch). */
  onFilter: (patch: Record<string, unknown>) => void;
}

/** Search (name / phone, server-side) + الكل | غير مقروءة, order and status, then the conversations. */
export function ThreadList({ search, threads, onFilter }: ThreadListProps) {
  return (
    <>
      <div className="mb-3 grid gap-2.5 max-sm:mb-2 max-sm:gap-2">
        <form
          role="search"
          key={search.q ?? ''}
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            onFilter({ q: new FormData(e.currentTarget).get('q') });
          }}
        >
          <Icon name="search" className="pointer-events-none absolute start-[11px] top-1/2 -translate-y-1/2 text-ink-3" />
          <Input
            type="search"
            name="q"
            defaultValue={search.q}
            aria-label={t.common.search}
            placeholder={t.inbox.searchPlaceholder}
            className="ps-9"
          />
        </form>
        {/* Phones: the filters on one compact row under the search. */}
        <div className="grid gap-2.5 max-sm:flex max-sm:items-center max-sm:gap-1.5">
          <SegmentedControl
            label={t.inbox.title}
            value={search.unread ? 'unread' : 'all'}
            onChange={(v) => onFilter({ unread: v === 'unread' })}
            options={[
              { value: 'all', label: t.inbox.filterAll },
              { value: 'unread', label: t.inbox.filterUnread },
            ]}
            className="max-sm:shrink-0"
          />
          <ThreadListControls search={search} onFilter={onFilter} />
        </div>
      </div>
      {threads.length === 0 ? (
        <EmptyState title={search.unread ? t.inbox.emptyUnread : t.inbox.empty} />
      ) : (
        <ul aria-label={t.inbox.title} className="border-t border-rule">
          {threads.map((th) => (
            <ThreadRow key={th.phone_e164} thread={th} search={search} active={th.phone_e164 === search.phone} />
          ))}
        </ul>
      )}
    </>
  );
}
