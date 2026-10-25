import { useId } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { SearchInput } from '@/components/ui/form/search-input';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ValuesFilter } from './values-search';

const v = t.settingsValues;

export interface ValuesToolbarProps {
  q: string;
  filter?: ValuesFilter | undefined;
  onQ: (q: string) => void;
  onFilter: (filter: ValuesFilter | undefined) => void;
  /** The filter chips are desktop-only (docs/26b §2 «Phone»). */
  phone: boolean;
  counts: Record<ValuesFilter, number>;
}

/** The search over every group, and the filters «المعدَّلة فقط» / «العامة فقط»; both list «الكل». */
export function ValuesToolbar({ q, filter, onQ, onFilter, phone, counts }: ValuesToolbarProps) {
  const id = useId();
  const chip = (f: ValuesFilter, label: string) => (
    <button
      type="button"
      aria-pressed={filter === f}
      onClick={() => onFilter(filter === f ? undefined : f)}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm sm:min-h-9',
        filter === f ? 'border-lapis bg-lapis-wash font-semibold text-ink' : 'border-rule text-ink-2 hover:bg-sunk',
      )}
    >
      {filter === f && <Icon name="check" />}
      {label}
      <span className="text-xs text-ink-3 tabular-nums">{counts[f]}</span>
    </button>
  );
  return (
    <div role="search" className="mb-4 flex flex-wrap items-center gap-3">
      <label htmlFor={id} className="sr-only">
        {v.searchLabel}
      </label>
      <div className="min-w-0 flex-1 sm:max-w-[420px]">
        <SearchInput id={id} value={q} placeholder={v.searchPlaceholder} aria-describedby={`${id}-hint`} onChange={(e) => onQ(e.target.value)} />
        <span id={`${id}-hint`} className="sr-only">
          {v.searchHint}
        </span>
      </div>
      {!phone && (
        <div role="group" aria-label={v.filters} className="flex flex-wrap gap-2">
          {chip('modified', v.filterModified)}
          {chip('public', v.filterPublic)}
        </div>
      )}
    </div>
  );
}
