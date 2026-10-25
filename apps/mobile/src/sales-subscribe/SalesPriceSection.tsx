import type { SalesQuoteView } from '@ab/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Section } from '@/more/Section';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { SalesQuotePreview } from './SalesQuotePreview';
import { salesErrorText } from './sales-errors';

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
