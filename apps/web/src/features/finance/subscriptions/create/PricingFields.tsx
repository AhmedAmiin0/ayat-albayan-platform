import {
  CUSTOM_COUNT_MAX,
  CUSTOM_COUNT_MIN,
  PACKAGE_IDS,
  PRICING_DURATIONS,
  SITE_COUNTRIES,
} from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { SegmentedControl } from '@/components/ui/form/segmented-control';
import { durationLabel, packageCopy } from '@/features/finance/pricing/format';
import { t } from '@/lib/i18n/i18n';
import type { PricingForm } from './pricing-form';

type Props = {
  form: PricingForm;
  set: (patch: Partial<PricingForm>) => void;
  /** Only these discounts as pills (sales: the site's 0/5/10/15 %); omitted = a free 0–100 number. */
  discounts?: readonly number[];
};

const discountLabel = (d: number) =>
  t.pricing.discounts[`${d}` as keyof typeof t.pricing.discounts] ?? `${d}%`;

/** Package, count, duration, discount and country: the calculator's inputs, never a price. */
export function PricingFields({ form, set, discounts }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t.subscriptions.package}>
        {(p) => (
          <Select
            {...p}
            value={form.pkg}
            onChange={(e) => set({ pkg: e.target.value as PricingForm['pkg'] })}
          >
            {PACKAGE_IDS.map((id) => (
              <option key={id} value={id}>
                {packageCopy(id).name}
              </option>
            ))}
            <option value="custom">{t.pricing.customLabel}</option>
          </Select>
        )}
      </Field>
      {form.pkg === 'custom' && (
        <Field label={t.pricing.customCount}>
          {(p) => (
            <Input
              {...p}
              type="number"
              dir="ltr"
              min={CUSTOM_COUNT_MIN}
              max={CUSTOM_COUNT_MAX}
              value={form.count}
              onChange={(e) => set({ count: Number(e.target.value) })}
            />
          )}
        </Field>
      )}
      <Field
        label={t.subscriptions.duration}
        hint={form.pkg === 'weekly' ? t.pricing.fixedDuration : undefined}
      >
        {(p) => (
          <Select
            {...p}
            value={form.duration}
            disabled={form.pkg === 'weekly'}
            onChange={(e) => set({ duration: Number(e.target.value) as PricingForm['duration'] })}
          >
            {PRICING_DURATIONS.map((d) => (
              <option key={d} value={d}>
                {durationLabel(d)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {discounts ? (
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-ink">{t.subscriptions.discount}</span>
          <SegmentedControl
            label={t.subscriptions.discount}
            options={discounts.map((d) => ({ value: String(d), label: discountLabel(d) }))}
            value={String(form.discount)}
            onChange={(v) => set({ discount: Number(v) })}
          />
        </div>
      ) : (
        <Field label={t.subscriptions.discount}>
          {(p) => (
            <Input
              {...p}
              type="number"
              dir="ltr"
              min={0}
              max={100}
              value={form.discount}
              onChange={(e) => set({ discount: Number(e.target.value) })}
            />
          )}
        </Field>
      )}
      <Field label={t.subscriptions.country}>
        {(p) => (
          <Select
            {...p}
            value={form.country}
            onChange={(e) => set({ country: e.target.value as PricingForm['country'] })}
          >
            <option value="">{t.subscriptions.guardianCountry}</option>
            {SITE_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {t.pricing.countries[c]}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  );
}
