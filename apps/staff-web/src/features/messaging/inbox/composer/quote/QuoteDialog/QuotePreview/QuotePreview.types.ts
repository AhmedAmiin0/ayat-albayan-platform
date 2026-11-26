import type { UseQueryResult } from '@tanstack/react-query';

export interface QuotePreviewProps {
  /** The client's message: one package's offer or the whole price list; null before an answer. */
  text: string | null;
  /** The text may not leave (the previous choice's, or an invalid custom amount): it is dimmed. */
  held: boolean;
  /** The request of the mode that shows. */
  query: Pick<UseQueryResult, 'isError' | 'isFetching' | 'isPending'>;
}
