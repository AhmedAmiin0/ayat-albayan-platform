import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { StepKey } from './draft';

/**
 * «خطوة 2 من 5» and the step names of this booking type; done steps get a filled nuqta, the current one half.
 * On a phone only the current step keeps its name on screen (six names wrap to two rows); a screen reader hears all.
 */
export function WizardSteps({ steps, step }: { steps: readonly StepKey[]; step: StepKey }) {
  const current = steps.indexOf(step);
  return (
    <div className="mb-5 grid gap-2">
      <p className="text-xs text-ink-3 tabular-nums">
        {t.booking.stepOf.replace('{n}', String(current + 1)).replace('{total}', String(steps.length))}
      </p>
      <ol className="flex flex-wrap gap-x-5 gap-y-1.5 border-b-[3px] border-double border-gold pb-2.5 text-sm">
        {steps.map((key, i) => (
          <li
            key={key}
            aria-current={i === current ? 'step' : undefined}
            className={cn('flex items-center gap-1.5', i === current ? 'font-semibold text-ink' : 'text-ink-3')}
          >
            <NuqtaGlyph shape={i < current ? 'fill' : i === current ? 'half' : 'hollow'} />
            <span className={cn(i !== current && 'max-sm:sr-only')}>{t.booking.steps[key]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
