import type { ClosedStep, StepState } from '@ab/client-core';
import type { ReactNode } from 'react';
import { Icon, Pill } from '#/components/ui/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { cn } from '#/lib/index.ts';

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

/**
 * What is left before the chat opens (FamChatWebClosed): subscribe, the teacher, the chat; the
 * current step carries «الخطوة الحالية», a done one «تم.» under its name.
 */
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
