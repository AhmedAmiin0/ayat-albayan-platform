import { cn, FormAlert, t } from '@ab/web-kit';
import type { QuotePreviewProps } from './QuotePreview.types';
import { PREVIEW_TEXT } from './quote-preview.helpers';

/** The text exactly as the client will get it, or why there is none yet. */
export function QuotePreview({ text, held, query }: QuotePreviewProps) {
  return (
    <section aria-labelledby="quote-preview" aria-busy={query.isFetching} className="grid gap-1.5">
      <h3 id="quote-preview" className="text-xs font-semibold text-ink-2">
        {t.inbox.quote.preview}
      </h3>
      {query.isError && <FormAlert>{t.common.error}</FormAlert>}
      {text === null && query.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
      {text !== null && (
        <p data-testid="quote-text" className={cn(PREVIEW_TEXT, held && 'opacity-60')}>
          {text}
        </p>
      )}
    </section>
  );
}
