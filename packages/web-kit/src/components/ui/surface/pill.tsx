import type { Tone } from '@ab/money';
import type { ReactNode } from 'react';
import { cn } from '@ab/web-kit/lib/utils';

// A state that needs the family is a tinted Pill, a passive one a Dot; AA-tested.

const PILL: Readonly<Record<Tone, string>> = {
  ok: 'bg-ok-soft text-ok',
  act: 'bg-act-soft text-act',
  bad: 'bg-danger-soft text-danger',
  neutral: 'bg-neutral-soft text-ink-2',
};

const DOT: Readonly<Record<Tone, string>> = {
  ok: 'bg-ok',
  act: 'bg-act',
  bad: 'bg-danger',
  neutral: 'bg-ink-3',
};

interface MarkProps {
  tone: Tone;
  children: ReactNode;
  className?: string;
}

export function Pill({ tone, children, className }: MarkProps) {
  return (
    <span
      data-tone={tone}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs',
        'font-semibold tabular-nums',
        PILL[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export interface DotProps extends MarkProps {
  /** The dot pops in once when the state turns on, never loops. */
  live?: boolean;
}

export function Dot({ tone, children, live = false, className }: DotProps) {
  return (
    <span
      data-tone={tone}
      className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-ink-2', className)}
    >
      <span
        aria-hidden="true"
        className={cn('size-2 shrink-0 rounded-full', DOT[tone], live && 'animate-pop-in')}
      />
      {children}
    </span>
  );
}
