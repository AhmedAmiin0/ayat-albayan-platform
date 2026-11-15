import { LEAD_STATUSES } from '@ab/shared';
import { SelectFilterField } from '@/components/table-toolbar/fields';
import { t } from '@/lib/i18n/i18n';
import { THREAD_SORTS } from '@/features/messaging/inbox/shared/search';
import type { ThreadFilterOptions } from './thread-filters';

/**
 * The list's order and the lead's status (R-NFR-08, server-side) in the shared «تصفية» panel.
 * Teacher mode has neither «غير المقروءة أولًا» nor leads.
 */
export function ThreadFilterFields({ search, mode, onFilter }: ThreadFilterOptions) {
  const sorts = mode === 'teacher' ? THREAD_SORTS.filter((s) => s !== 'unread') : THREAD_SORTS;
  return (
    <>
      <SelectFilterField
        label={t.inbox.sort.label}
        value={search.sort}
        options={[{ value: '', label: t.inbox.sort.latest }, ...sorts.map((s) => ({ value: s, label: t.inbox.sort[s] }))]}
        onChange={(sort) => onFilter({ sort })}
      />
      {mode !== 'teacher' && (
        <SelectFilterField
          label={t.inbox.statusFilter}
          value={search.f_status}
          options={[{ value: '', label: t.inbox.allStatuses }, ...LEAD_STATUSES.map((s) => ({ value: s, label: t.enums.leadStatus[s] }))]}
          onChange={(f_status) => onFilter({ f_status })}
        />
      )}
    </>
  );
}
