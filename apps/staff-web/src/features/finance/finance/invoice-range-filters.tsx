import { chipIfSet, DateFilterField } from '@/components/table-toolbar/fields';
import type { ExtraFilters } from '@/components/table-toolbar/types';
import { t } from '@/lib/i18n/i18n';
import { clearFilterSearch } from '@/lib/list/list-search';
import type { InvoicesUrlSearch } from './search';

export interface InvoiceRangeOptions {
  search: InvoicesUrlSearch;
  /** A URL patch; the page sends it back to page 1. */
  onChange: (patch: Record<string, unknown>) => void;
}

/** The created-day range of /admin/invoices as the table toolbar's extra filters, with their chips. */
export function invoiceRangeFilters({ search, onChange }: InvoiceRangeOptions): ExtraFilters {
  return {
    fields: (
      <div className="grid grid-cols-2 gap-3">
        <DateFilterField label={t.finance.from} value={search.from} onChange={(from) => onChange({ from })} />
        <DateFilterField label={t.finance.to} value={search.to} onChange={(to) => onChange({ to })} />
      </div>
    ),
    chips: [
      ...chipIfSet({ id: 'from', label: t.finance.from, value: search.from, onRemove: () => onChange({ from: undefined }) }),
      ...chipIfSet({ id: 'to', label: t.finance.to, value: search.to, onRemove: () => onChange({ to: undefined }) }),
    ],
    onClearAll: (keys) => onChange({ from: undefined, to: undefined, ...clearFilterSearch(keys) }),
  };
}
