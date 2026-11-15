import {
  CUSTOM_COUNT_MAX,
  CUSTOM_COUNT_MIN,
  DEFAULT_DURATION,
  DISCOUNT_MAX,
  DISCOUNTS,
  parseDiscount,
  PRICING_DURATIONS,
  SITE_COUNTRIES,
  STUDENTS_MAX,
  STUDENTS_MIN,
  type PackageId,
} from '@ab/shared';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { OTHER, type Selection } from '@/features/finance/pricing/api';
import { SegmentStep } from './SegmentStep';
import { Stepper } from './Stepper';

const COUNTRY_OPTIONS = [
  ...SITE_COUNTRIES.map((c) => ({ value: c, label: t.pricing.countries[c] })),
  { value: OTHER, label: t.pricing.otherCountry },
];
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
const DISCOUNT_OPTIONS = DISCOUNTS.map((d) => ({
  value: String(d),
  label: t.pricing.discounts[d],
}));

export interface CalcStepsProps {
  sel: Selection;
  onChange: (patch: Partial<Selection>) => void;
  /** The free 0–100 field beside the pills (the calculator); the chat's «عرض سعر» has the pills only. */
  freeDiscount?: boolean;
}

/**
 * The five calculator steps (docs/08 §3): country, duration, package, students, discount. Shared by
 * «حاسبة الأسعار» and the chat's «عرض سعر» sheet.
 */
export function CalcSteps({ sel, onChange, freeDiscount = true }: CalcStepsProps) {
  const weekly = sel.pkg === 'weekly';
  return (
    <div className="grid content-start gap-6">
      <SegmentStep
        label={t.pricing.steps.country}
        options={COUNTRY_OPTIONS}
        value={sel.country}
        onChange={(country) => onChange({ country })}
      />
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
        {freeDiscount && (
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
        )}
      </SegmentStep>
    </div>
  );
}
