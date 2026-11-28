import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Cartouche, FormAlert, PageHead, ListSkeleton, t, cn } from '@ab/web-kit';
import { catalogQuery, INITIAL_SELECTION, quoteQuery, type Selection } from '@/features/finance/pricing/api';
import { CalcSteps } from '@/features/finance/pricing/calculator/CalcSteps';
import { quoteSummary } from '@/features/finance/pricing/format';
import { FxNote } from '@/features/finance/pricing/calculator/FxNote';
import { PdfDownload } from '@/features/finance/pricing/PdfDownload';
import { PlansTable } from '@/features/finance/pricing/PlansTable';
import { QuoteResult } from '@/features/finance/pricing/calculator/QuoteResult';
import { useDebounced } from '@/features/finance/pricing/use-debounced';

const sectionTitle = 'font-display text-h4 font-bold text-ink';

/** Every price comes from the API (docs/08); the steps only choose what to ask for. */
export function PricingPage() {
  const [sel, setSel] = useState<Selection>(INITIAL_SELECTION);
  const asked = useDebounced(sel);
  const quote = useQuery(quoteQuery(asked));
  // Until the debounce settles and the new quote arrives, the card shows the previous choice.
  const stale = sel !== asked || quote.isPlaceholderData;
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
          {/* Screen readers hear the new price once it is in (not the whole card). */}
          <p className="sr-only" aria-live="polite">
            {quote.data && !stale ? quoteSummary(quote.data) : ''}
          </p>
          {quote.isError && <FormAlert>{t.common.error}</FormAlert>}
          {quote.isPending && <p className="py-6 text-ink-3">{t.common.loading}</p>}
          {quote.data && (
            <div
              className={cn(
                'transition-opacity duration-[120ms]',
                quote.isPlaceholderData && 'opacity-60',
              )}
            >
              <QuoteResult quote={quote.data} stale={stale} />
            </div>
          )}
        </section>
      </div>

      <CatalogSection asked={asked} />
    </>
  );
}

/** Shows the rate's source when prices are converted. */
function CatalogSection({ asked }: { asked: Selection }) {
  const catalog = useQuery(catalogQuery(asked));
  return (
    <section aria-labelledby="pricing-table" className="mt-10 grid gap-3">
      <div>
        <h2 id="pricing-table" className={sectionTitle}>
          {t.pricing.tableTitle}
        </h2>
        <p className="text-xs text-ink-3">{t.pricing.tableSubtitle}</p>
      </div>
      <PdfDownload sel={asked} />
      {catalog.isError && <FormAlert>{t.common.error}</FormAlert>}
      {catalog.isPending && <ListSkeleton />}
      {catalog.data && <PlansTable packages={catalog.data.packages} />}
      {catalog.data?.fx && <FxNote fx={catalog.data.fx} />}
    </section>
  );
}
