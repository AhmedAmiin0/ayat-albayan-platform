import type { Tone } from '@ab/shared';
import type { ReactNode } from 'react';
import { cn } from '#/lib/index.ts';

// Status words (owner 2026-11-19): a state that needs the family («يحتاج تأكيد», an amount due,
// «جديد») is a tinted Pill; a passive one («مؤكدة», «انتهت») is a coloured Dot and plain text.
// Tone text on its own wash and ink-2 on any surface are AA (theme.contrast.test.ts).

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
  /** The state just turned on («الدخول متاح الآن»): the dot pops in once, never loops. */
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
