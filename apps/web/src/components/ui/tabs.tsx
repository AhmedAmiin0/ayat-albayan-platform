import type { KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import type { SegmentOption } from './segmented-control';

export interface TabsProps<V extends string> {
  label: string;
  tabs: SegmentOption<V>[];
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

const tabClass = {
  horizontal:
    '-mb-px whitespace-nowrap border-b-[3px] border-double border-transparent px-3.5 pt-2 pb-2.5 font-medium text-ink-2 aria-selected:border-gold aria-selected:font-semibold aria-selected:text-ink',
  vertical:
    'flex items-baseline gap-1.5 whitespace-nowrap rounded-sm border border-rule px-2.5 py-[7px] text-xs text-ink-2 hover:bg-sunk aria-selected:bg-gold-wash aria-selected:font-semibold aria-selected:text-ink aria-selected:shadow-[inset_0_0_0_1px_var(--gold-soft)] shell:border-transparent',
};

/** Next tab = inline-end, which is the LEFT arrow in RTL. */
const STEP: Record<string, number> = { ArrowLeft: 1, ArrowDown: 1, ArrowRight: -1, ArrowUp: -1 };

/** role=tablist filter/tab strip. Arrow keys move along the reading direction (RTL aware). */
export function Tabs<V extends string>({ label, tabs, value, onChange, orientation = 'horizontal', className }: TabsProps<V>) {
  const vertical = orientation === 'vertical';
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = STEP[e.key];
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
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      onKeyDown={onKeyDown}
      className={cn(
        'flex overflow-x-auto',
        vertical ? 'gap-1.5 pb-1 shell:flex-col shell:gap-px shell:self-start' : 'mb-5 gap-1 border-b border-rule',
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={tab.value === value}
          tabIndex={tab.value === value ? 0 : -1}
          onClick={() => onChange(tab.value)}
          className={tabClass[orientation]}
        >
          {tab.label}
          {vertical && <span aria-hidden="true" className="hidden min-w-3 flex-1 -translate-y-1 border-b-[1.5px] border-dotted border-rule-strong shell:block" />}
          {tab.count !== undefined && (
            <span className={cn('tabular-nums text-ink-3', !vertical && 'ms-1')}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
