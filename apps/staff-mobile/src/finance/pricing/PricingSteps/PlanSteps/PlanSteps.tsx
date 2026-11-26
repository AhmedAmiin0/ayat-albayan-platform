import { CUSTOM_COUNT_MAX, CUSTOM_COUNT_MIN } from '@ab/money';
import { t, FilterPills, Note, Section } from '@ab/mobile-kit';
import { Stepper } from '@/finance/pricing/Stepper';
import type { PlanStepsProps } from './PlanSteps.types';
import { DURATIONS, PLANS } from './plan-steps.helpers';

/** The two steps that pick one package: the lesson's duration, then the package or a count. */
export function PlanSteps({ selection: s, onChange }: PlanStepsProps) {
  const p = t.pricing;
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
