import { useQuery } from '@tanstack/react-query';
import { PdfPage, type PdfZoom } from '@ab/mobile-kit';
import { pdfPageQuery } from '@/inbox/messages/hooks/thread-file';

interface ThreadPdfPageProps {
  phone: string;
  id: string;
  page: number;
  pages: number;
  onZoom: (shown: PdfZoom) => void;
}

/** One page of a chat PDF (the kit's PdfPage), its image signed by the staff API when shown. */
export function ThreadPdfPage({ phone, id, page, pages, onZoom }: ThreadPdfPageProps) {
  const answer = useQuery(pdfPageQuery(phone, id, page));
  return (
    <PdfPage
      page={page}
      pages={pages}
      url={answer.data?.url}
      failed={!answer.data && answer.error !== null}
      version={answer.dataUpdatedAt}
      onRetry={() => void answer.refetch()}
      onZoom={onZoom}
    />
  );
}
