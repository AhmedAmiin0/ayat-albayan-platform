import { useRef } from 'react';
import { t } from '@/lib/i18n';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import type { FilterChip } from './types';

export interface ActiveFilterChipsProps {
  chips: FilterChip[];
  onClearAll: () => void;
  /** Focus goes here when the row disappears (its last chip removed, or «مسح الكل»): the «تصفية» button. */
  onEmpty?: (() => void) | undefined;
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

/**
 * The set filters as removable chips («المعلم: أبرار ×»), then «مسح الكل»; nothing when none is set.
 * Removing a chip unmounts the button that has focus, so focus moves first: to the next chip (the
 * previous one for the last), or out of the row to `onEmpty` when nothing is left (WCAG 2.4.3).
 */
export function ActiveFilterChips({ chips, onClearAll, onEmpty }: ActiveFilterChipsProps) {
  const list = useRef<HTMLUListElement>(null);
  if (chips.length === 0) return null;
  const remove = (c: FilterChip, i: number) => {
    // The chips are the first buttons of the list, «مسح الكل» the last, which stays while chips remain.
    if (chips.length > 1) list.current?.querySelectorAll('button')[i === chips.length - 1 ? i - 1 : i + 1]?.focus();
    else onEmpty?.();
    c.onRemove();
  };
  const clearAll = () => {
    onEmpty?.();
    onClearAll();
  };
  return (
    <ul ref={list} aria-label={t.table.activeFilters} className="mb-3 flex flex-wrap items-center gap-2">
      {chips.map((c, i) => (
        <li key={c.id} className="min-w-0 max-w-full">
          <button type="button" aria-label={t.table.removeFilter.replace('{filter}', chipText(c))} onClick={() => remove(c, i)} className={CHIP}>
            <span className="truncate">{chipText(c)}</span>
            <span aria-hidden="true" className={CHIP_X}>
              <Icon name="x" className="size-3.5" />
            </span>
          </button>
        </li>
      ))}
      <li>
        <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
          {t.table.clearAll}
        </Button>
      </li>
    </ul>
  );
}
