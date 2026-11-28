import { NuqtaGlyph, t, cn } from '@ab/web-kit';
import type { StepKey } from './draft/draft';

const glyphOf = (i: number, current: number) => {
  const shape = i === current ? 'half' : 'hollow';
  return i < current ? 'fill' : shape;
};

/** On a phone only the current step keeps its name on screen; a screen reader hears all. */
export function WizardSteps({ steps, step }: { steps: readonly StepKey[]; step: StepKey }) {
  const current = steps.indexOf(step);
  return (
    <div className="mb-5 grid gap-2">
      <p className="text-xs text-ink-3 tabular-nums">
        {t.booking.stepOf
          .replace('{n}', String(current + 1))
          .replace('{total}', String(steps.length))}
      </p>
      <ol className="flex flex-wrap gap-x-5 gap-y-1.5 border-b border-rule pb-2.5 text-sm">
        {steps.map((key, i) => (
          <li
            key={key}
            aria-current={i === current ? 'step' : undefined}
            className={cn(
              'flex items-center gap-1.5',
              i === current ? 'font-semibold text-ink' : 'text-ink-3',
            )}
          >
            <NuqtaGlyph shape={glyphOf(i, current)} />
            <span className={cn(i !== current && 'max-sm:sr-only')}>{t.booking.steps[key]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
