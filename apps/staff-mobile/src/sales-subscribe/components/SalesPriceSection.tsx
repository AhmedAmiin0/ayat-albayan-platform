import type { SalesQuoteView } from '@ab/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { t, ErrorState, Section } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { SalesQuotePreview } from './SalesQuotePreview';
import { salesErrorText } from '@/sales-subscribe/lib/sales-errors';

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
