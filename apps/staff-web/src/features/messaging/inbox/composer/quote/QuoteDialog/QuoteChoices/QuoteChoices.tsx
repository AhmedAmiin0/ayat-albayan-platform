import { phoneCountryLine } from '@ab/client-core';
import { isolateLtr, locale, t } from '@ab/web-kit';
import { CalcSteps, SegmentStep } from '@/features/finance/pricing';
import { CustomAmountToggle, CustomPriceField } from '@/features/finance/subscriptions';
import type { QuoteChoicesProps } from './QuoteChoices.types';
import { MODE_OPTIONS, ROUNDING_OPTIONS } from './quote-choices.helpers';

/**
 * What the staff member chooses on the sheet. The line about the number's country is for them
 * only: it never moves the country step, which prices in one of the site's countries or in USD.
 */
export function QuoteChoices(p: QuoteChoicesProps) {
  const list = p.mode === 'all';
  const from = phoneCountryLine(p.phone, { lang: locale, words: t.inbox.quote });
  return (
    <>
      <SegmentStep
        label={t.inbox.quote.mode.label}
        options={MODE_OPTIONS}
        value={p.mode}
        onChange={p.onMode}
      />
      {from !== null && (
        <p data-testid="quote-client-country" className="text-xs text-ink-2">
          {isolateLtr(from)}
        </p>
      )}
      <CalcSteps
        sel={p.choice}
        onChange={p.onChange}
        allPackages={list}
        discountExtra={!list && <CustomAmountToggle {...p.custom.toggle} />}
      />
      {p.rounds && (
        <SegmentStep
          label={t.inbox.quote.rounding.label}
          options={ROUNDING_OPTIONS}
          value={p.choice.rounding}
          onChange={(rounding) => p.onChange({ rounding })}
        />
      )}
      {!list && <CustomPriceField price={p.custom} />}
    </>
  );
}
