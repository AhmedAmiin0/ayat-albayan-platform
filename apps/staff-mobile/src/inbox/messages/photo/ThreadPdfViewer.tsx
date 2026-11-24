import { type MessageView, pdfMetaLine, type ThreadPdfPage as PdfDoc } from '@ab/shared';
import { t, PdfViewer } from '@ab/mobile-kit';
import { DownloadLink } from '@/inbox/messages/copy-download/DownloadLink';
import { ThreadPdfPage } from './ThreadPdfPage';

interface ThreadPdfViewerProps {
  message: MessageView;
  phone: string;
  /** Page 1's answer (the bubble's cache): the page count and size. */
  doc: PdfDoc;
  name: string;
  onClose: () => void;
}

export function ThreadPdfViewer({ message: m, phone, doc, name, onClose }: ThreadPdfViewerProps) {
  return (
    <PdfViewer
      name={name}
      meta={pdfMetaLine(doc, t.inbox.pdf)}
      pages={doc.pages}
      renderPage={(page, onZoom) => (
        <ThreadPdfPage phone={phone} id={m.id} page={page} pages={doc.pages} onZoom={onZoom} />
      )}
      footer={<DownloadLink message={m} phone={phone} />}
      onClose={onClose}
    />
  );
}
