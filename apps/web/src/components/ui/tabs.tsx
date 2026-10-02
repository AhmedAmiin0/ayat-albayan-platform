import { Fragment, useSyncExternalStore, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import type { SegmentOption } from './segmented-control';

export interface TabOption<V extends string> extends SegmentOption<V> {
  /** Vertical fihris only: a hairline before this tab to group it (docs/07 §9). */
  separatorBefore?: boolean;
}

export interface TabsProps<V extends string> {
  label: string;
  tabs: TabOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /**
   * horizontal: profile tabs, the selected one sits on a 3px double gold rule (docs/07 .tabs).
   * vertical: a fihris filter (inbox status) with dotted leaders and counts like page numbers;
   * it turns into horizontal chips below 900px.
   */
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

// 44px touch targets below the `shell:` breakpoint (docs/07 §4).
const tabClass = {
  horizontal:
    '-mb-px min-h-11 whitespace-nowrap border-b-[3px] border-double border-transparent px-3.5 pt-2 pb-2.5 font-medium text-ink-2 aria-selected:border-gold aria-selected:font-semibold aria-selected:text-ink',
  vertical:
    'flex min-h-11 items-center gap-1.5 whitespace-nowrap shell:min-h-0 shell:items-baseline rounded-sm border border-rule px-2.5 py-[7px] text-xs text-ink-2 hover:bg-sunk aria-selected:bg-gold-wash aria-selected:font-semibold aria-selected:text-ink aria-selected:shadow-[inset_0_0_0_1px_var(--gold-soft)] shell:border-transparent',
};

// The vertical fihris is a chip row below `shell:` (56.25rem), so say so to assistive tech.
const WIDE = '(min-width: 56.25rem)';
const hasMedia = () => typeof matchMedia === 'function';
function subscribe(onChange: () => void): () => void {
  if (!hasMedia()) return () => undefined;
  const query = matchMedia(WIDE);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
const isWide = () => !hasMedia() || matchMedia(WIDE).matches;

/** Next tab = inline-end: the LEFT arrow in RTL, the RIGHT arrow in LTR. */
const STEP_RTL: Record<string, number> = { ArrowLeft: 1, ArrowDown: 1, ArrowRight: -1, ArrowUp: -1 };
const STEP_LTR: Record<string, number> = { ...STEP_RTL, ArrowLeft: -1, ArrowRight: 1 };
const isLtr = (el: Element) => el.closest('[dir]')?.getAttribute('dir') === 'ltr';

/** role=tablist filter/tab strip. Arrow keys move along the reading direction (RTL aware). */
export function Tabs<V extends string>({
  label,
  tabs,
  value,
  onChange,
  orientation = 'horizontal',
  className,
}: TabsProps<V>) {
  const vertical = orientation === 'vertical';
  const wide = useSyncExternalStore(subscribe, isWide);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = (isLtr(e.currentTarget) ? STEP_LTR : STEP_RTL)[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const to = (tabs.findIndex((tab) => tab.value === value) + step + tabs.length) % tabs.length;
    const next = tabs[to];
    if (!next) return;
    onChange(next.value);
    e.currentTarget.querySelectorAll<HTMLElement>('[role=tab]')[to]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      aria-orientation={vertical && wide ? 'vertical' : 'horizontal'}
      onKeyDown={onKeyDown}
      className={cn(
        'flex overflow-x-auto',
        vertical
          ? '-m-1 gap-1.5 p-1 shell:flex-col shell:gap-px shell:self-start' // p-1: room for the focus ring
          : 'mb-5 gap-1 border-b border-rule',
        className,
      )}
    >
      {tabs.map((tab) => (
        <Fragment key={tab.value}>
          {vertical && tab.separatorBefore && (
            <hr aria-hidden="true" className="my-1.5 hidden border-rule shell:block" />
          )}
          <button
            type="button"
            role="tab"
            aria-selected={tab.value === value}
            tabIndex={tab.value === value ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={tabClass[orientation]}
          >
            {tab.label}
            {tab.count !== undefined && (
              <>
                {/* The dotted leader points at a count; without one there is nothing to lead to. */}
                {vertical && (
                  <span
                    aria-hidden="true"
                    className="hidden min-w-3 flex-1 -translate-y-1 border-b-[1.5px] border-dotted border-rule-strong shell:block"
                  />
                )}
                <span className={cn('tabular-nums text-ink-3', !vertical && 'ms-1')}>
                  {tab.count}
                </span>
              </>
            )}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
