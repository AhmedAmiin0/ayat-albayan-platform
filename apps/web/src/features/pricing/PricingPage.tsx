import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Cartouche } from '@/components/ui/cartouche';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { catalogQuery, INITIAL_SELECTION, quoteQuery, type Selection } from './api';
import { CalcSteps } from './CalcSteps';
import { PlansTable } from './PlansTable';
import { QuoteResult } from './QuoteResult';
import { useDebounced } from './use-debounced';

const sectionTitle = 'font-display text-h4 font-bold text-ink';

/**
 * /admin/pricing «حاسبة الأسعار» (docs/08): the site's staff calculator. Every price comes from
 * GET /pricing/quote and /pricing/catalog; the steps only choose what to ask for.
 */
export function PricingPage() {
  const [sel, setSel] = useState<Selection>(INITIAL_SELECTION);
  const asked = useDebounced(sel);
  const quote = useQuery(quoteQuery(asked));
  const catalog = useQuery(catalogQuery(asked));
  const onChange = useCallback(
    (patch: Partial<Selection>) => setSel((s) => ({ ...s, ...patch })),
    [],
  );

  return (
    <>
      <PageHead className="mb-2">
        <Cartouche>{t.pricing.title}</Cartouche>
        <span className="text-xs text-ink-3">{t.pricing.kicker}</span>
      </PageHead>
      <p className="mb-6 max-w-[70ch] text-body text-pretty text-ink-2">{t.pricing.subtitle}</p>

      <div className="grid gap-x-10 gap-y-8 @min-[880px]:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <CalcSteps sel={sel} onChange={onChange} />
        <section
          aria-labelledby="pricing-result"
          aria-busy={quote.isFetching}
          className="grid content-start gap-3 border-t border-rule pt-6 @min-[880px]:border-t-0 @min-[880px]:border-s @min-[880px]:ps-10 @min-[880px]:pt-0"
        >
          <h2 id="pricing-result" className={sectionTitle}>
            {t.pricing.resultTitle}
          </h2>
          {quote.isError && <FormAlert>{t.common.error}</FormAlert>}
          {quote.isPending && <p className="py-6 text-ink-3">{t.common.loading}</p>}
          {quote.data && (
            <div
              className={cn(
                'transition-opacity duration-[120ms]',
                quote.isPlaceholderData && 'opacity-60',
              )}
            >
              <QuoteResult quote={quote.data} />
            </div>
          )}
        </section>
      </div>

      <section aria-labelledby="pricing-table" className="mt-10 grid gap-3">
        <div>
          <h2 id="pricing-table" className={sectionTitle}>
            {t.pricing.tableTitle}
          </h2>
          <p className="text-xs text-ink-3">{t.pricing.tableSubtitle}</p>
        </div>
        {catalog.isError && <FormAlert>{t.common.error}</FormAlert>}
        {catalog.isPending && <p className="py-6 text-center text-ink-3">{t.common.loading}</p>}
        {catalog.data && <PlansTable packages={catalog.data.packages} />}
      </section>
    </>
  );
}
