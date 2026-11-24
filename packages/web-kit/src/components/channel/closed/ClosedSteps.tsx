import type { ClosedStep, StepState } from '@ab/client-core';
import type { ReactNode } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Pill } from '@ab/web-kit/components/ui/surface/pill';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';

const card = t.studentChannel.closedCard;

/** The mark before a step: ✓ done, the clock now, else its number. */
const MARKS: Readonly<Record<StepState, (n: number) => ReactNode>> = {
  done: () => <Icon name="check" className="size-4" />,
  current: () => <Icon name="clock" className="size-4" />,
  pending: (n) => n,
};

const MARK_TONE: Readonly<Record<StepState, string>> = {
  done: 'bg-ok-soft text-ok',
  current: 'bg-accent text-lapis',
  pending: 'bg-sunk text-ink-2',
};

export function ClosedSteps({ steps }: { steps: readonly ClosedStep[] }) {
  return (
    <ol className="grid divide-y divide-rule text-start">
      {steps.map((step, i) => (
        <li key={step.key} className="flex items-start gap-3 py-3">
          <span
            aria-hidden="true"
            className={cn(
              'grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold',
              MARK_TONE[step.state],
            )}
          >
            {MARKS[step.state](i + 1)}
          </span>
          <div className="grid gap-0.5">
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
              {card.steps[step.key]}
              {step.state === 'current' && <Pill tone="ok">{card.current}</Pill>}
            </p>
            <p className="text-xs text-ink-2">
              {step.state === 'done' ? card.done : card.notes[step.key]}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
