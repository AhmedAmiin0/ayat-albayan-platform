import { t } from '@/lib/i18n';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import type { FilterChip } from './types';

export interface ActiveFilterChipsProps {
  chips: FilterChip[];
  onClearAll: () => void;
}

const chipText = (c: FilterChip) => t.table.activeFilter.replace('{label}', c.label).replace('{value}', c.value);

// A hairline pill on the mint wash; the whole chip is the remove button, its × a visible target of
// its own. 32px from 640px, the 44px touch floor below it (and on coarse pointers, components.css).
const CHIP = [
  'group inline-flex min-h-8 max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-rule-strong bg-lapis-wash ps-3 pe-1.5 text-xs text-ink',
  'transition-colors duration-[120ms] hover:border-ink-3 hover:bg-sunk motion-safe:active:scale-[0.98] max-sm:min-h-11 max-sm:ps-4 max-sm:pe-2',
].join(' ');
const CHIP_X =
  'grid size-5 shrink-0 place-items-center rounded-full text-ink-3 transition-colors duration-[120ms] group-hover:bg-rule group-hover:text-ink max-sm:size-7';

/** The set filters as removable chips («المعلم: أبرار ×»), then «مسح الكل»; nothing when none is set. */
export function ActiveFilterChips({ chips, onClearAll }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;
  return (
    <ul aria-label={t.table.activeFilters} className="mb-3 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <li key={c.id} className="min-w-0 max-w-full">
          <button type="button" aria-label={t.table.removeFilter.replace('{filter}', chipText(c))} onClick={c.onRemove} className={CHIP}>
            <span className="truncate">{chipText(c)}</span>
            <span aria-hidden="true" className={CHIP_X}>
              <Icon name="x" className="size-3.5" />
            </span>
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
