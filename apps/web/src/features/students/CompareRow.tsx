import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Match } from './compare';

const base = 'flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 px-2.5 py-2 sm:px-3.5 sm:py-2.5';

/** Cell classes of the duplicate compare grid (docs/design ink-and-gold.html `.compare`). */
export const cell = {
  head: cn(base, 'border-b border-b-rule bg-sunk text-xs font-semibold text-ink-3'),
  existing: 'bg-gold-wash/45',
};

/** ✓ same / ≈ near (saffron: the admin decides now) / different, never red: nothing went wrong. */
const RESULT: Record<Match | 'phone', { icon: IconName; label: string; className: string }> = {
  same: { icon: 'check', label: t.students.sameValue, className: 'text-ok' },
  phone: { icon: 'check', label: t.students.samePhone, className: 'text-ok' },
  near: { icon: 'approx', label: t.students.nearName, className: 'text-act' },
  differs: { icon: 'x', label: t.students.differs, className: 'text-ink-2' },
};

export type CompareRowProps = {
  label: string;
  now: ReactNode;
  /** Empty until the existing student's profile has loaded. */
  existing: ReactNode;
  match: Match | 'phone' | undefined;
  /** The name row: values at 16px. */
  large?: boolean;
  last?: boolean;
};

/** One field of the compare: label | typed | existing | result. On phones the label heads the row. */
export function CompareRow({ label, now, existing, match, large, last }: CompareRowProps) {
  const line = last ? '' : 'border-b border-rule';
  const value = cn(base, line, 'font-semibold text-ink', large && 'text-base');
  const result = match && RESULT[match];
  return (
    <div role="row" className="contents">
      <span role="rowheader" className={cn(base, line, 'text-xs text-ink-3 max-sm:col-span-full max-sm:border-b-0 max-sm:pt-2.5 max-sm:pb-0 max-sm:font-semibold')}>
        {label}
      </span>
      <span role="cell" className={value}>{now}</span>
      <span role="cell" className={cn(value, cell.existing)}>{existing}</span>
      <span role="cell" className={cn(base, line, 'text-xs font-semibold max-sm:col-span-full max-sm:pt-0.5 max-sm:pb-2.5', result?.className)}>
        {result && (
          <>
            <Icon name={result.icon} className="size-[15px] stroke-2" />
            <span>{result.label}</span>
          </>
        )}
      </span>
    </div>
  );
}
