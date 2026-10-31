import { baseMime, quoteKindOf, type MessageQuote } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { threadFileQuery } from '@/features/messaging/inbox/api/api';
import { threadPdfPageQuery } from '@/features/messaging/inbox/api/api.files';

/** A photo the browser draws (HEIC stays a named link, as in the bubble). */
const drawable = (mime: string): boolean => mime.startsWith('image/') && baseMime(mime) !== 'image/heic';

/**
 * The thumb of a quoted photo or PDF (owner 2026-10-31): the same queries as the bubble, read from
 * the cache only, so a quote shows it once the bubble's file (or PDF page 1) was opened; W6:
 * rendering the log never signs a URL. Anything else, or nothing cached: null (the icon stays).
 */
export function useQuoteThumb(quote: MessageQuote, phone: string): string | null {
  const kind = quoteKindOf(quote.media_mime);
  const file = useQuery({ ...threadFileQuery(phone, quote.id), enabled: false });
  const page = useQuery({ ...threadPdfPageQuery(phone, quote.id, 1), enabled: false });
  if (kind === 'image') return file.data && drawable(file.data.mime) ? file.data.url : null;
  return kind === 'pdf' ? (page.data?.url ?? null) : null;
}
