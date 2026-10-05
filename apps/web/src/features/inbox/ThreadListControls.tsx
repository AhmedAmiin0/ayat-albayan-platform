import { LEAD_STATUSES } from '@ab/shared';
import { Select } from '@/components/ui/select';
import { t } from '@/lib/i18n';
import { useInboxMode } from './mode';
import { THREAD_SORTS, type InboxSearch } from './search';

export interface ThreadListControlsProps {
  search: InboxSearch;
  /** A filter patch; the page resets to 1 and unknown values drop (parseInboxSearch). */
  onFilter: (patch: Record<string, unknown>) => void;
}

const selectClass = 'min-h-10 w-auto min-w-0 flex-1 text-xs sm:min-h-9';

/**
 * The list's order and the lead's status (R-NFR-08, server-side): compact selects under the
 * search. Teacher mode has neither «غير المقروءة أولًا» (her unread is counted apart) nor leads.
 */
export function ThreadListControls({ search, onFilter }: ThreadListControlsProps) {
  const mode = useInboxMode();
  const sorts = mode === 'teacher' ? THREAD_SORTS.filter((s) => s !== 'unread') : THREAD_SORTS;
  return (
    <div className="flex gap-2">
      <Select
        aria-label={t.inbox.sort.label}
        value={search.sort ?? ''}
        onChange={(e) => onFilter({ sort: e.target.value })}
        className={selectClass}
      >
        <option value="">{t.inbox.sort.latest}</option>
        {sorts.map((s) => (
          <option key={s} value={s}>
            {t.inbox.sort[s]}
          </option>
        ))}
      </Select>
      {mode !== 'teacher' && (
        <Select
          aria-label={t.inbox.statusFilter}
          value={search.f_status ?? ''}
          onChange={(e) => onFilter({ f_status: e.target.value })}
          className={selectClass}
        >
          <option value="">{t.inbox.allStatuses}</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.enums.leadStatus[s]}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
