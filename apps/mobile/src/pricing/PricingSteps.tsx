import {
  CUSTOM_COUNT_MAX,
  CUSTOM_COUNT_MIN,
  DISCOUNTS,
  PRICING_DURATIONS,
  SITE_COUNTRIES,
  STUDENTS_MAX,
  STUDENTS_MIN,
} from '@ab/shared';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Section } from '@/more/Section';
import { FilterPills, type FilterPill } from '@/ui/FilterPills';
import { DiscountField } from './DiscountField';
import type { CountryChoice, PlanChoice, Selection } from './selection';
import { Stepper } from './Stepper';

const p = t.pricing;

const COUNTRIES: readonly FilterPill<CountryChoice>[] = [
  ...SITE_COUNTRIES.map((c) => ({ value: c, label: p.countries[c] })),
  { value: 'other', label: p.otherCountry },
];
const DURATIONS = PRICING_DURATIONS.map((d) => {
  const value = `${d}` as const;
  return { value, label: p.durations[value] };
});
/** The site's frequency order (مرة … كل يوم), then «عدد مخصوص». */
const BY_FREQUENCY = ['weekly', 'starter', 'standard', 'premium', 'monthly', 'bulk'] as const;
const PLANS: readonly FilterPill<PlanChoice>[] = [
  ...BY_FREQUENCY.map((id) => ({ value: id, label: p.frequencies[id] })),
  { value: 'custom', label: p.customLabel },
];
const DISCOUNT_PILLS = DISCOUNTS.map((d) => {
  const value = `${d}` as const;
  return { value, label: p.discounts[value] };
});

export interface PricingStepsProps {
  selection: Selection;
  onChange: (patch: Partial<Selection>) => void;
}

/** The site's five steps: country, duration, lessons a week (or a custom count), students, discount. */
export function PricingSteps({ selection: s, onChange }: PricingStepsProps) {
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
      </Section>
    </>
  );
}
