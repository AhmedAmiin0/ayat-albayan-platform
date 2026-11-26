import { STUDENTS_MAX, STUDENTS_MIN } from '@ab/money';
import { t, FilterPills, Note, Section } from '@ab/mobile-kit';
import { DiscountField } from '@/finance/pricing/DiscountField';
import { Stepper } from '@/finance/pricing/Stepper';
import { PlanSteps } from './PlanSteps';
import type { PricingStepsProps } from './PricingSteps.types';
import { COUNTRIES, DISCOUNT_PILLS } from './pricing-steps.helpers';

/** The calculator's steps (docs/08 §3). As on the site, any discount may also be typed. */
export function PricingSteps(props: PricingStepsProps) {
  const { selection: s, onChange, planSteps = true, discountExtra } = props;
  const p = t.pricing;
  return (
    <>
      <Section title={p.steps.country}>
        <FilterPills
          items={COUNTRIES}
          value={s.country}
          onChange={(country) => onChange({ country })}
          accessibilityLabel={p.steps.country}
          role="radiogroup"
        />
      </Section>
      {planSteps ? <PlanSteps selection={s} onChange={onChange} /> : null}
      <Section title={p.steps.students}>
        <Stepper
          label={p.studentsLabel}
          value={s.students}
          min={STUDENTS_MIN}
          max={STUDENTS_MAX}
          onChange={(students) => onChange({ students })}
        />
        <Note>{p.familyHint}</Note>
      </Section>
      <Section title={p.steps.discount}>
        <FilterPills
          items={DISCOUNT_PILLS}
          value={s.discount}
          onChange={(discount) => onChange({ discount })}
          accessibilityLabel={p.steps.discount}
          role="radiogroup"
        />
        <DiscountField value={s.discount} onChange={(discount) => onChange({ discount })} />
        {discountExtra}
      </Section>
    </>
  );
}
