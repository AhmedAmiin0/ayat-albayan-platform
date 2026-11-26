import { CUSTOM_COUNT_MAX, CUSTOM_COUNT_MIN } from '@ab/money';
import { t } from '@ab/web-kit';
import { SegmentStep } from '@/features/finance/pricing/calculator/SegmentStep';
import { Stepper } from '@/features/finance/pricing/calculator/Stepper';
import type { PackageStepsProps } from './PackageSteps.types';
import { DURATION_OPTIONS, durationOf, PACKAGE_OPTIONS } from './package-steps.helpers';

/** The duration and package steps (docs/08 §3): what one quote asks and a price list does not. */
export function PackageSteps({ sel, onChange }: PackageStepsProps) {
  const weekly = sel.pkg === 'weekly';
  return (
    <>
      <SegmentStep
        label={t.pricing.steps.duration}
        options={DURATION_OPTIONS}
        value={String(sel.duration)}
        onChange={(v) => onChange({ duration: durationOf(v) })}
        hidden={weekly}
      >
        {weekly && <p className="text-sm text-ink-2">{t.pricing.fixedDuration}</p>}
      </SegmentStep>
      <SegmentStep
        label={t.pricing.steps.frequency}
        options={PACKAGE_OPTIONS}
        value={sel.pkg}
        onChange={(pkg) => onChange({ pkg })}
      >
        {sel.pkg === 'custom' && (
          <div className="mt-2">
            <Stepper
              label={t.pricing.customCount}
              value={sel.count}
              min={CUSTOM_COUNT_MIN}
              max={CUSTOM_COUNT_MAX}
              onChange={(count) => onChange({ count })}
            />
          </div>
        )}
      </SegmentStep>
    </>
  );
}
