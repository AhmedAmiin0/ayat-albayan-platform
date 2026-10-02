import { PACKAGE_SIZES, type PackageSize } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { quoteQuery } from '@/features/pricing/api';
import { Money } from '@/features/pricing/Money';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { BookingDraft } from './draft';
import { quoteSelection, type PriceInput } from './price';

export interface PackageStepProps {
  draft: BookingDraft;
  onChange: (pkg: PackageSize) => void;
}

/** Trial first (the usual first booking), then the paid sizes in order. */
const ORDER: readonly PackageSize[] = ['trial', ...PACKAGE_SIZES.filter((p) => p !== 'trial')];

/**
 * Step 4 (R-SCH-06, docs/08): the package, each with its catalog price from GET /pricing/quote in
 * the guardian's currency for this lesson length and group size. The client never prices.
 */
export function PackageStep({ draft, onChange }: PackageStepProps) {
  const students = Math.max(1, draft.students.length);
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{t.booking.pickPackage}</legend>
      <ul className="grid gap-2 sm:grid-cols-2">
        {ORDER.map((pkg) => (
          <li key={pkg}>
            <label
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5',
                draft.pkg === pkg ? 'border-lapis bg-accent' : 'border-rule hover:bg-sunk',
              )}
            >
              <input
                type="radio"
                name="booking-package"
                checked={draft.pkg === pkg}
                onChange={() => onChange(pkg)}
                className="size-4 accent-[var(--lapis)]"
              />
              <span className="font-semibold">{t.enums.packageSize[pkg]}</span>
              <span className="ms-auto text-sm">
                <PackagePrice input={{ pkg, durationMin: draft.durationMin, country: draft.country, students }} />
              </span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

/** The quote's total, «الحلقة التجريبية مجانية» for a trial, or why there is no price. */
export function PackagePrice({ input }: { input: PriceInput }) {
  const selection = quoteSelection(input);
  const quote = useQuery({ ...quoteQuery(selection ?? { ...emptySelection }), enabled: selection !== null });
  if (input.pkg === 'trial') return <span className="text-ok">{t.booking.trialFree}</span>;
  if (!selection) return <span className="text-xs text-ink-3">{t.booking.noPrice}</span>;
  if (quote.isError) return <span className="text-xs text-ink-3">{t.common.error}</span>;
  if (!quote.data) return <span className="text-xs text-ink-3">{t.common.loading}</span>;
  return <Money amount={quote.data.total} currency={quote.data.currency} />;
}

// Only to keep the hook call unconditional; disabled queries never run.
const emptySelection = { country: 'other', duration: 45, pkg: 'custom', count: 1, students: 1, discount: 0 } as const;
