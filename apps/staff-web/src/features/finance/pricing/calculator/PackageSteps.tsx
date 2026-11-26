import {
  CUSTOM_COUNT_MAX,
  CUSTOM_COUNT_MIN,
  DEFAULT_DURATION,
  PRICING_DURATIONS,
  type PackageId,
} from '@ab/money';
import { t } from '@ab/web-kit';
import type { CalcStepsProps } from './CalcSteps.types';
import { SegmentStep } from './SegmentStep';
import { Stepper } from './Stepper';

const DURATION_OPTIONS = PRICING_DURATIONS.map((d) => ({
  value: String(d),
  label: t.pricing.durations[d],
}));
/** The site's frequency order: once a week up to every day. */
const FREQUENCY_ORDER: readonly PackageId[] = [
  'weekly',
  'starter',
  'standard',
  'premium',
  'monthly',
  'bulk',
];
const PACKAGE_OPTIONS = [
  ...FREQUENCY_ORDER.map((id) => ({ value: id, label: t.pricing.frequencies[id] })),
  { value: 'custom' as const, label: t.pricing.customLabel },
];

/** The duration and package steps (docs/08 §3): what one quote asks and a price list does not. */
export function PackageSteps({ sel, onChange }: Pick<CalcStepsProps, 'sel' | 'onChange'>) {
  const weekly = sel.pkg === 'weekly';
  return (
    <>
      <SegmentStep
        label={t.pricing.steps.duration}
        options={DURATION_OPTIONS}
        value={String(sel.duration)}
        onChange={(v) =>
          onChange({ duration: PRICING_DURATIONS.find((d) => String(d) === v) ?? DEFAULT_DURATION })
        }
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
