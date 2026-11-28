import { PDF_PREVIEW_PAGES } from '@ab/shared';
import { useState } from 'react';
import { t } from '../../../lib/i18n/i18n';
import { useA11yPref } from '../../../ui/primitives/use-a11y-pref';
import type { PdfZoom } from '../PdfPage';
import { useCurrentPage } from '../use-current-page';
import type { PdfViewerProps } from './PdfViewer.types';

const moreLine = (pages: number): string | null =>
  pages > PDF_PREVIEW_PAGES ? t.inbox.pdf.more.replace('{n}', String(PDF_PREVIEW_PAGES)) : null;
export function usePdfViewer({ pages }: Pick<PdfViewerProps, 'pages'>) {
  const still = useA11yPref('reduceMotion');
  const [zoomed, setZoomed] = useState<PdfZoom | null>(null);
  const { current, onViewable, viewability } = useCurrentPage();
  const shown = Array.from({ length: Math.min(pages, PDF_PREVIEW_PAGES) }, (_, i) => i + 1);
  const more = moreLine(pages);
  return { still, zoomed, setZoomed, current, onViewable, viewability, shown, more };
}
