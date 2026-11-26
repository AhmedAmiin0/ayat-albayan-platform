import {
  DISCOUNT_MAX,
  DISCOUNTS,
  parseDiscount,
  SITE_COUNTRIES,
  STUDENTS_MAX,
  STUDENTS_MIN,
} from '@ab/money';
import { Input, t } from '@ab/web-kit';
import { OTHER } from '@/features/finance/pricing/api';
import type { CalcStepsProps } from './CalcSteps.types';
import { PackageSteps } from './PackageSteps';
import { SegmentStep } from './SegmentStep';
import { Stepper } from './Stepper';

const COUNTRY_OPTIONS = [
  ...SITE_COUNTRIES.map((c) => ({ value: c, label: t.pricing.countries[c] })),
  { value: OTHER, label: t.pricing.otherCountry },
];
const DISCOUNT_OPTIONS = DISCOUNTS.map((d) => ({
  value: String(d),
  label: t.pricing.discounts[d],
}));

/** The five calculator steps (docs/08 §3), shared with the chat's quote sheet. */
export function CalcSteps({ sel, onChange, allPackages = false, discountExtra }: CalcStepsProps) {
  return (
    <div className="grid content-start gap-6">
      <SegmentStep
        label={t.pricing.steps.country}
        options={COUNTRY_OPTIONS}
        value={sel.country}
        onChange={(country) => onChange({ country })}
      />
      {!allPackages && <PackageSteps sel={sel} onChange={onChange} />}
      <Stepper
        label={t.pricing.steps.students}
        value={sel.students}
        min={STUDENTS_MIN}
        max={STUDENTS_MAX}
        onChange={(students) => onChange({ students })}
        hint={sel.students > 1 ? t.pricing.familyHint : undefined}
      />
      <SegmentStep
        label={t.pricing.steps.discount}
        options={DISCOUNT_OPTIONS}
        value={String(sel.discount)}
        onChange={(v) => onChange({ discount: parseDiscount(v) })}
      >
        {/* The site's free field beside the pills: any 0–100, decimals allowed. */}
        <span className="flex items-center gap-1.5 text-sm text-ink-2">
          <Input
            type="number"
            inputMode="decimal"
            dir="ltr"
            min={0}
            max={DISCOUNT_MAX}
            step="any"
            aria-label={t.pricing.steps.discount}
            value={sel.discount}
            onChange={(e) => onChange({ discount: parseDiscount(e.target.value) })}
            className="w-20 text-center tabular-nums [&[dir=ltr]]:text-center"
          />
          <span aria-hidden="true">%</span>
        </span>
        {discountExtra}
      </SegmentStep>
    </div>
  );
}
