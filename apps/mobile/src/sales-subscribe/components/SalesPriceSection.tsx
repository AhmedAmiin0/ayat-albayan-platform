import type { SalesQuoteView } from '@ab/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { t, ErrorState } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { Section } from '@/core/ui/surface/Section';
import { SalesQuotePreview } from './SalesQuotePreview';
import { salesErrorText } from '@/sales-subscribe/lib/sales-errors';

/** «المبلغ المطلوب تحويله»: the API's quote, its error with a retry, or loading. */
export function SalesPriceSection({ quote }: { quote: UseQueryResult<SalesQuoteView> }) {
  return (
    <Section title={t.salesMoney.price}>
      {quote.isError ? (
        <ErrorState message={salesErrorText(quote.error)} onRetry={() => void quote.refetch()} />
      ) : quote.data ? (
        <SalesQuotePreview quote={quote.data} stale={quote.isPlaceholderData} />
      ) : (
        <Note>{t.common.loading}</Note>
      )}
    </Section>
  );
}
