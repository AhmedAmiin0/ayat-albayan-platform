import type { ThreadView } from '@ab/shared';
import { ColumnFilterText } from '@/components/data-table/ColumnFilterText';
import { TableToolbar } from '@/components/table-toolbar/TableToolbar';
import { SegmentedControl, t } from '@ab/web-kit';
import { useInboxMode } from '@/features/messaging/inbox/shared/mode';
import type { InboxSearch } from '@/features/messaging/inbox/shared/search';
import { ThreadFilterFields } from './ThreadFilterFields';
import { ThreadResults } from './ThreadResults';
import { CLEAR_THREAD_FILTERS, threadFilterChips } from './thread-filters';

export interface ThreadListProps {
  search: InboxSearch;
  threads: ThreadView[];
  /** A filter patch; the page resets to 1 and blank values drop (parseInboxSearch). */
  onFilter: (patch: Record<string, unknown>) => void;
  total?: number | undefined;
}

export function ThreadList({ search, threads, onFilter, total }: ThreadListProps) {
  const options = { search, mode: useInboxMode(), onFilter };
  return (
    <>
      <TableToolbar
        compact
        search={
          <ColumnFilterText
            ariaLabel={t.common.search}
            placeholder={t.inbox.searchPlaceholder}
            value={search.q ?? ''}
            onChange={(q) => onFilter({ q })}
          />
        }
        fields={<ThreadFilterFields {...options} />}
        chips={threadFilterChips(options)}
        onClearAll={() => onFilter(CLEAR_THREAD_FILTERS)}
        resultCount={total}
        end={
          <SegmentedControl
            label={t.inbox.title}
            value={search.unread ? 'unread' : 'all'}
            onChange={(v) => onFilter({ unread: v === 'unread' })}
            options={[
              { value: 'all', label: t.inbox.filterAll },
              { value: 'unread', label: t.inbox.filterUnread },
            ]}
          />
        }
      />
      <ThreadResults search={search} threads={threads} />
    </>
  );
}
