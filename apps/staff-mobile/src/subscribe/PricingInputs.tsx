import {
  CUSTOM_COUNT_MAX,
  CUSTOM_COUNT_MIN,
  DISCOUNTS,
  PRICING_DURATIONS,
  SITE_COUNTRIES,
} from '@ab/money';
import type { ReactNode } from 'react';
import { t, FilterPills, type FilterPill, Section } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { DiscountField } from '@/finance/pricing/DiscountField';
import type { PlanChoice } from '@/finance/pricing/selection';
import { Stepper } from '@/finance/pricing/Stepper';
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
const BY_SIZE = ['weekly', 'starter', 'standard', 'premium', 'monthly', 'bulk'] as const;
const PLANS: readonly FilterPill<PlanChoice>[] = [
  ...BY_SIZE.map((id) => ({ value: id, label: p.packages[id].sessions })),
  { value: 'custom', label: p.customLabel },
];
const DISCOUNT_PILLS = DISCOUNTS.map((d) => {
  const value = `${d}` as const;
  return { value, label: p.discounts[value] };
});

interface PricingInputsProps {
  form: SubscribeForm;
  onChange: (patch: Partial<SubscribeForm>) => void;
  /** false (sales): only the site's 0/5/10/15 % pills, no free number. Default true (admin). */
  freeDiscount?: boolean;
  discountExtra?: ReactNode;
}

/** One child per package (docs/08); never computes a price. */
export function PricingInputs(props: PricingInputsProps) {
  const { form, onChange, freeDiscount = true, discountExtra } = props;
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
        {discountExtra}
      </Section>
    </>
  );
}
