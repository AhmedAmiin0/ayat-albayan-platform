import { t } from '@/lib/i18n';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import type { FilterChip } from './types';

export interface ActiveFilterChipsProps {
  chips: FilterChip[];
  onClearAll: () => void;
}

const chipText = (c: FilterChip) => t.table.activeFilter.replace('{label}', c.label).replace('{value}', c.value);

/** The set filters as small removable chips («المعلم: أبرار ×»), then «مسح الكل»; nothing when none is set. */
export function ActiveFilterChips({ chips, onClearAll }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;
  return (
    <ul aria-label={t.table.activeFilters} className="mb-3 flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <li key={c.id} className="min-w-0">
          <button
            type="button"
            aria-label={t.table.removeFilter.replace('{filter}', chipText(c))}
            onClick={c.onRemove}
            className="inline-flex min-h-8 max-w-full cursor-pointer items-center gap-1 rounded-full border border-rule bg-lapis-wash ps-3 pe-2 text-xs text-ink hover:bg-sunk max-sm:min-h-9"
          >
            <span className="truncate">{chipText(c)}</span>
            <Icon name="x" className="size-3.5 shrink-0 text-ink-3" />
          </button>
        </li>
      ))}
      <li>
        <Button type="button" variant="ghost" size="sm" onClick={onClearAll}>
          {t.table.clearAll}
        </Button>
      </li>
    </ul>
  );
}
