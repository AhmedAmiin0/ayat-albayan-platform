import { SUBSCRIPTION_STATUSES } from '@ab/catalog';
import { chipIfSet, SelectFilterField } from '@/components/table-toolbar/fields';
import type { ExtraFilters } from '@/components/table-toolbar/types';
import { t } from '@ab/web-kit';
import { clearFilterSearch } from '@/lib/list/list-search';
import type { SubscriptionFilter } from '@ab/client-core';

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

export function useSubscriptionFilters({ status, onChange }: SubscriptionFiltersOptions): ExtraFilters {
  const setStatus = (v: string) => onChange({ status: (v || undefined) });
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
