import type { ThreadView } from '@ab/shared';
import { ColumnFilterText } from '@/components/ColumnFilterText';
import { TableToolbar } from '@/components/table-toolbar/TableToolbar';
import { EmptyState } from '@/components/ui/display/empty-state';
import { SegmentedControl } from '@/components/ui/form/segmented-control';
import { t } from '@/lib/i18n/i18n';
import { useInboxMode } from './mode';
import type { InboxSearch } from './search';
import { ThreadFilterFields } from './ThreadFilterFields';
import { ThreadRow } from './ThreadRow';
import { emptyTitle } from './empty-title';
import { CLEAR_THREAD_FILTERS, threadFilterChips } from './thread-filters';

export interface ThreadListProps {
  search: InboxSearch;
  threads: ThreadView[];
  /** A filter patch; the page resets to 1 and blank values drop (parseInboxSearch). */
  onFilter: (patch: Record<string, unknown>) => void;
  /** The conversations the filters leave: «عرض النتائج (14)». */
  total?: number | undefined;
}

/**
 * The shared table toolbar (search by name / phone, «تصفية» with the order and the lead status, their
 * chips) with the الكل | غير مقروءة tabs at the end of its row, then the conversations.
 */
export function ThreadList({ search, threads, onFilter, total }: ThreadListProps) {
  const options = { search, mode: useInboxMode(), onFilter };
  return (
    <>
      {/* compact: search, the icon «تصفية» and الكل/غير مقروءة on one row in the 300–400px list column. */}
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
      {threads.length === 0 ? (
        <EmptyState title={emptyTitle(search)} />
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
