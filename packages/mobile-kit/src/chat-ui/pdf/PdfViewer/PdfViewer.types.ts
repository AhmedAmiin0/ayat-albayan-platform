import type { ReactElement, ReactNode } from 'react';
import type { PdfZoom } from '../PdfPage';

export interface PdfViewerProps {
  name: string;
  meta: string;
  /** The PDF's page count (the first PDF_PREVIEW_PAGES are shown). */
  pages: number;
  /** One page, its image fetched by the caller: usually a PdfPage. */
  renderPage: (page: number, onZoom: (shown: PdfZoom) => void) => ReactElement;
  footer?: ReactNode;
  onClose: () => void;
}
