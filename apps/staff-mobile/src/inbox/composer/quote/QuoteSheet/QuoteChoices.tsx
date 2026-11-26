import { phoneCountryLine } from '@ab/client-core';
import { ROUNDING_MODES, type Rounding } from '@ab/money';
import { t, locale, ltr, FilterPills, type FilterPill, Note, Section } from '@ab/mobile-kit';
import { PricingSteps } from '@/finance';
import { CustomAmountPill } from '@/payments';
import { CustomPriceField } from '@/subscribe';
import type { QuoteMode } from '@/inbox/composer/quote/use-quote-sheet.types';
import type { QuoteChoicesProps } from './QuoteChoices.types';

const q = t.inbox.quote;

const MODES: readonly FilterPill<QuoteMode>[] = [
  { value: 'one', label: q.mode.one },
  { value: 'all', label: q.mode.all },
];
const ROUNDINGS: readonly FilterPill<Rounding>[] = ROUNDING_MODES.map((value) => ({
  value,
  label: q.rounding[value],
}));

/**
 * What the staff member chooses. The price list has every duration and package, so their steps
 * and the custom amount belong to one package only; rounding shows only while it can move a price.
 */
export function QuoteChoices({ phone, sheet }: QuoteChoicesProps) {
  const one = sheet.mode === 'one';
  // Information for the staff member only: the country step keeps its own default.
  const from = phoneCountryLine(phone, { lang: locale, words: q, wrap: ltr });
  const customPill = <CustomAmountPill on={sheet.custom.on} onChange={sheet.custom.setOn} />;
  return (
    <>
      <FilterPills
        items={MODES}
        value={sheet.mode}
        onChange={sheet.setMode}
        accessibilityLabel={q.mode.label}
        role="radiogroup"
        wrap
      />
      {from === null ? null : <Note>{from}</Note>}
      <PricingSteps
        selection={sheet.selection}
        onChange={sheet.change}
        planSteps={one}
        discountExtra={one ? customPill : null}
      />
      {one ? <CustomPriceField price={sheet.custom} /> : null}
      {sheet.roundable ? (
        <Section title={q.rounding.label}>
          <FilterPills
            items={ROUNDINGS}
            value={sheet.rounding}
            onChange={sheet.setRounding}
            accessibilityLabel={q.rounding.label}
            role="radiogroup"
            wrap
          />
        </Section>
      ) : null}
    </>
  );
}
