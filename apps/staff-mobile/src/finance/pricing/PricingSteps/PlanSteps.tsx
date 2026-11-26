import { CUSTOM_COUNT_MAX, CUSTOM_COUNT_MIN, PRICING_DURATIONS } from '@ab/money';
import { t, FilterPills, type FilterPill, Note, Section } from '@ab/mobile-kit';
import type { PlanChoice } from '@/finance/pricing/selection';
import { Stepper } from '@/finance/pricing/Stepper';
import type { PlanStepsProps } from './PlanSteps.types';

const p = t.pricing;

const DURATIONS = PRICING_DURATIONS.map((d) => {
  const value = `${d}` as const;
  return { value, label: p.durations[value] };
});
const BY_FREQUENCY = ['weekly', 'starter', 'standard', 'premium', 'monthly', 'bulk'] as const;
const PLANS: readonly FilterPill<PlanChoice>[] = [
  ...BY_FREQUENCY.map((id) => ({ value: id, label: p.frequencies[id] })),
  { value: 'custom', label: p.customLabel },
];

/** The two steps that pick one package: the lesson's duration, then the package or a count. */
export function PlanSteps({ selection: s, onChange }: PlanStepsProps) {
  return (
    <>
      <Section title={p.steps.duration}>
        {s.plan === 'weekly' ? (
          <Note>{p.fixedDuration}</Note>
        ) : (
          <FilterPills
            items={DURATIONS}
            value={s.duration}
            onChange={(duration) => onChange({ duration })}
            accessibilityLabel={p.steps.duration}
            role="radiogroup"
          />
        )}
      </Section>
      <Section title={p.steps.frequency}>
        <FilterPills
          items={PLANS}
          value={s.plan}
          onChange={(plan) => onChange({ plan })}
          accessibilityLabel={p.steps.frequency}
          role="radiogroup"
        />
        {s.plan === 'custom' ? (
          <Stepper
            label={p.customCount}
            value={s.count}
            min={CUSTOM_COUNT_MIN}
            max={CUSTOM_COUNT_MAX}
            onChange={(count) => onChange({ count })}
          />
        ) : null}
      </Section>
    </>
  );
}
