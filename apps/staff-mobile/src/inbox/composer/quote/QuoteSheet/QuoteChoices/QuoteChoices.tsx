import { phoneCountryLine } from '@ab/client-core';
import { t, locale, ltr, FilterPills, Note, Section } from '@ab/mobile-kit';
import { PricingSteps } from '@/finance';
import { CustomAmountPill } from '@/payments';
import { CustomPriceField } from '@/subscribe';
import type { QuoteChoicesProps } from './QuoteChoices.types';
import { MODES, ROUNDINGS } from './quote-choices.helpers';

/**
 * What the staff member chooses. The price list has every duration and package, so their steps
 * and the custom amount belong to one package only; rounding shows only while it can move a price.
 */
export function QuoteChoices({ phone, sheet }: QuoteChoicesProps) {
  const q = t.inbox.quote;
  const one = sheet.mode === 'one';
  // Information for the staff member only: the country step keeps its own default.
  const from = phoneCountryLine(phone, { lang: locale, words: q, wrap: ltr });
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
        discountExtra={
          one ? <CustomAmountPill on={sheet.custom.on} onChange={sheet.custom.setOn} /> : null
        }
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
