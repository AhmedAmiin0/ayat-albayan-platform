import { PDF_PREVIEW_PAGES } from '@ab/shared';
import { type ReactElement, type ReactNode, useState } from 'react';
import { FlatList, Modal, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '../../lib/i18n/i18n';
import { AppText } from '../../ui/primitives/AppText';
import { useA11yPref } from '../../ui/primitives/use-a11y-pref';
import { PhotoViewer } from '../photo/PhotoViewer';
import { ViewerClose } from '../photo/ViewerClose';
import { ViewerFooter } from '../photo/ViewerFooter';
import type { PdfZoom } from './PdfPage';
import { PdfViewerHead } from './PdfViewerHead';
import { PDF_LINE, useCurrentPage } from './use-current-page';

export interface PdfViewerProps {
  name: string;
  /** «12 صفحة · PDF · 1.2 ميغابايت». */
  meta: string;
  /** The PDF's page count (the first PDF_PREVIEW_PAGES are shown). */
  pages: number;
  /** One page, its image fetched by the caller: usually a PdfPage. */
  renderPage: (page: number, onZoom: (shown: PdfZoom) => void) => ReactElement;
  /** Under the pages and under a zoomed page («تنزيل»). */
  footer?: ReactNode;
  onClose: () => void;
}

const moreLine = (pages: number): string | null =>
  pages > PDF_PREVIEW_PAGES ? t.inbox.pdf.more.replace('{n}', String(PDF_PREVIEW_PAGES)) : null;

/**
 * A chat PDF full screen (owner 2026-10-29), RN core only (the APK updates by OTA): black,
 * «إغلاق», the name, its meta line, «صفحة 3 من 12» (the page in view) and the zoom hint, then the
 * pages one under another, each asked only when the list nears it. A tap on a page opens it in
 * PhotoViewer to pinch and pan: a zoom on the list itself would take the scroll. Past
 * PDF_PREVIEW_PAGES, a line says to download the file. Android's back closes it.
 */
export function PdfViewer({ name, meta, pages, renderPage, footer, onClose }: PdfViewerProps) {
  const still = useA11yPref('reduceMotion');
  const [zoomed, setZoomed] = useState<PdfZoom | null>(null);
  const { current, onViewable, viewability } = useCurrentPage();
  const shown = Array.from({ length: Math.min(pages, PDF_PREVIEW_PAGES) }, (_, i) => i + 1);
  const more = moreLine(pages);
  return (
    <Modal
      testID="pdf-viewer"
      visible
      animationType={still ? 'none' : 'fade'}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: 'black' }}>
        <ViewerClose onClose={onClose} />
        <PdfViewerHead name={name} meta={meta} current={current} pages={pages} />
        <FlatList
          testID="pdf-pages"
          data={shown}
          keyExtractor={(n) => String(n)}
          renderItem={({ item }) => renderPage(item, setZoomed)}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={3}
          viewabilityConfig={viewability}
          onViewableItemsChanged={onViewable}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 8, paddingBottom: 8 }}
          ListFooterComponent={
            more ? <AppText style={{ ...PDF_LINE, paddingHorizontal: 8 }}>{more}</AppText> : null
          }
        />
        <ViewerFooter>{footer}</ViewerFooter>
      </SafeAreaView>
      {zoomed ? (
        <PhotoViewer
          uri={zoomed.uri}
          label={zoomed.label}
          footer={footer}
          onClose={() => setZoomed(null)}
        />
      ) : null}
    </Modal>
  );
}
