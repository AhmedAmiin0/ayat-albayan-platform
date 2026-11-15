import { SUBSCRIPTION_STATUSES } from '@ab/shared';
import { chipIfSet, SelectFilterField } from '@/components/table-toolbar/fields';
import type { ExtraFilters } from '@/components/table-toolbar/types';
import { t } from '@/lib/i18n/i18n';
import { clearFilterSearch } from '@/lib/list/list-search';
import type { SubscriptionFilter } from './search';

const statusOptions = [
  { value: '', label: t.subscriptions.allStatuses },
  ...SUBSCRIPTION_STATUSES.map((s) => ({ value: s, label: t.enums.subscriptionStatus[s] })),
  { value: 'partial', label: t.finance.partiallyPaid },
];

export interface SubscriptionFiltersOptions {
  status: SubscriptionFilter | undefined;
  /** A URL patch; the page sends it back to page 1. */
  onChange: (patch: Record<string, unknown>) => void;
}

/** The status filter (stored statuses + «مدفوع جزئيًا») as the table toolbar's extra filter. */
export function useSubscriptionFilters({ status, onChange }: SubscriptionFiltersOptions): ExtraFilters {
  const setStatus = (v: string) => onChange({ status: (v || undefined) as SubscriptionFilter | undefined });
  return {
    fields: <SelectFilterField label={t.subscriptions.status} value={status} options={statusOptions} onChange={setStatus} />,
    chips: chipIfSet({
      id: 'status',
      label: t.subscriptions.status,
      value: status,
      text: statusOptions.find((o) => o.value === status)?.label,
      onRemove: () => setStatus(''),
    }),
    onClearAll: (keys) => onChange({ status: undefined, ...clearFilterSearch(keys) }),
  };
}
