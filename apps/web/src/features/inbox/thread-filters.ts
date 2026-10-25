import { chipIfSet } from '@/components/table-toolbar/fields';
import type { FilterChip } from '@/components/table-toolbar/types';
import { t } from '@/lib/i18n/i18n';
import type { InboxMode } from './mode';
import type { InboxSearch } from './search';

export interface ThreadFilterOptions {
  search: InboxSearch;
  /** Teacher mode has neither «غير المقروءة أولًا» (her unread is counted apart) nor lead statuses. */
  mode: InboxMode;
  /** A filter patch; the page resets to 1 and unknown values drop (parseInboxSearch). */
  onFilter: (patch: Record<string, unknown>) => void;
}

/** The set order and lead status as removable chips; the unread tabs and the search box are their own controls. */
export function threadFilterChips({ search, mode, onFilter }: ThreadFilterOptions): FilterChip[] {
  return [
    ...chipIfSet({
      id: 'sort',
      label: t.inbox.sort.label,
      value: search.sort,
      text: search.sort && t.inbox.sort[search.sort],
      onRemove: () => onFilter({ sort: undefined }),
    }),
    ...(mode === 'teacher'
      ? []
      : chipIfSet({
          id: 'f_status',
          label: t.inbox.statusFilter,
          value: search.f_status,
          text: search.f_status && t.enums.leadStatus[search.f_status],
          onRemove: () => onFilter({ f_status: undefined }),
        })),
  ];
}

/** «مسح الكل»: the order and the status (the search text and the unread tab stay). */
export const CLEAR_THREAD_FILTERS = { sort: undefined, f_status: undefined };
