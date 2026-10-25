import {
  CUSTOM_COUNT_MAX,
  CUSTOM_COUNT_MIN,
  DISCOUNTS,
  PRICING_DURATIONS,
  SITE_COUNTRIES,
} from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Section } from '@/more/Section';
import { DiscountField } from '@/pricing/DiscountField';
import type { PlanChoice } from '@/pricing/selection';
import { Stepper } from '@/pricing/Stepper';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import type { SubscribeForm } from './subscribe-form';

const p = t.pricing;
const s = t.subscriptions;

const COUNTRIES: readonly FilterPill<SubscribeForm['country']>[] = [
  { value: 'guardian', label: s.guardianCountry },
  ...SITE_COUNTRIES.map((c) => ({ value: c, label: p.countries[c] })),
];
const DURATIONS = PRICING_DURATIONS.map((d) => {
  const value = `${d}` as const;
  return { value, label: p.durations[value] };
});
/** By lessons a month (4 … 28), then «عدد مخصوص». */
const BY_SIZE = ['weekly', 'starter', 'standard', 'premium', 'monthly', 'bulk'] as const;
const PLANS: readonly FilterPill<PlanChoice>[] = [
  ...BY_SIZE.map((id) => ({ value: id, label: p.packages[id].sessions })),
  { value: 'custom', label: p.customLabel },
];
const DISCOUNT_PILLS = DISCOUNTS.map((d) => {
  const value = `${d}` as const;
  return { value, label: p.discounts[value] };
});

export interface PricingInputsProps {
  form: SubscribeForm;
  onChange: (patch: Partial<SubscribeForm>) => void;
  /** false (sales): only the site's pills 0/5/10/15 %, no free number field. Default true (admin). */
  freeDiscount?: boolean;
}

/**
 * The calculator's inputs for ONE child (docs/08): country (the guardian's by default), lesson
 * length, package (or a custom count) and discount. No students step: a family buys one package
 * per child. Built from the «حاسبة الأسعار» pieces; never a price.
 */
export function PricingInputs({ form, onChange, freeDiscount = true }: PricingInputsProps) {
  return (
    <>
      <Section title={s.country}>
        <FilterPills
          items={COUNTRIES}
          value={form.country}
          onChange={(country) => onChange({ country })}
          accessibilityLabel={s.country}
          role="radiogroup"
        />
      </Section>
      <Section title={s.package}>
        <FilterPills
          items={PLANS}
          value={form.plan}
          onChange={(plan) => onChange({ plan })}
          accessibilityLabel={s.package}
          role="radiogroup"
        />
        {form.plan === 'custom' ? (
          <Stepper
            label={p.customCount}
            value={form.count}
            min={CUSTOM_COUNT_MIN}
            max={CUSTOM_COUNT_MAX}
            onChange={(count) => onChange({ count })}
          />
        ) : null}
      </Section>
      <Section title={s.duration}>
        {form.plan === 'weekly' ? (
          <Note>{p.fixedDuration}</Note>
        ) : (
          <FilterPills
            items={DURATIONS}
            value={form.duration}
            onChange={(duration) => onChange({ duration })}
            accessibilityLabel={s.duration}
            role="radiogroup"
          />
        )}
      </Section>
      <Section title={s.discount}>
        <FilterPills
          items={DISCOUNT_PILLS}
          value={form.discount}
          onChange={(discount) => onChange({ discount })}
          accessibilityLabel={s.discount}
          role="radiogroup"
        />
        {freeDiscount ? (
          <DiscountField value={form.discount} onChange={(discount) => onChange({ discount })} />
        ) : null}
      </Section>
    </>
  );
}
