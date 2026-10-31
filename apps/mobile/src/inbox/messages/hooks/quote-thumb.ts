import { type MessageQuote, quoteKindOf } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { pdfPageQuery, threadFileQuery } from '@/inbox/messages/hooks/thread-file';
import { photoBox } from '@/inbox/messages/photo/media-problem';
import { useThreadMode } from '@/inbox/thread/hooks/thread-mode';

/**
 * The thumb of a quoted photo or PDF (owner 2026-10-31), through the bubble's own queries (one
 * cache, no second request). A photo is signed as its bubble is (PhotoPreview); PDF page 1 only
 * from the cache: the bubble renders it for a PDF staff sent, and a quote never makes the API parse
 * a family's file (PdfPreview). A teacher asks nothing (403 media_forbidden). null: icon only.
 */
export function useQuoteThumb(quote: MessageQuote, phone: string): string | null {
  const teacher = useThreadMode().kind === 'teacher';
  const photo = !teacher && photoBox(quote.media_mime) !== null;
  const file = useQuery({ ...threadFileQuery(phone, quote.id), enabled: photo });
  const page = useQuery({ ...pdfPageQuery(phone, quote.id, 1), enabled: false });
  if (photo) return file.data?.url ?? null;
  return !teacher && quoteKindOf(quote.media_mime) === 'pdf' ? (page.data?.url ?? null) : null;
}
