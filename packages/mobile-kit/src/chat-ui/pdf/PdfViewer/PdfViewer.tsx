import { PDF_PREVIEW_PAGES } from '@ab/shared';
import { type ReactElement, type ReactNode, useState } from 'react';
import { FlatList, Modal, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '../../../lib/i18n/i18n';
import { AppText } from '../../../ui/primitives/AppText';
import { useA11yPref } from '../../../ui/primitives/use-a11y-pref';
import { PhotoViewer } from '../../photo/PhotoViewer';
import { ViewerClose } from '../../photo/ViewerClose';
import { ViewerFooter } from '../../photo/ViewerFooter';
import type { PdfZoom } from '../PdfPage';
import { PdfViewerHead } from '../PdfViewerHead';
import { PDF_LINE, useCurrentPage } from '../use-current-page';

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

const moreLine = (pages: number): string | null =>
  pages > PDF_PREVIEW_PAGES ? t.inbox.pdf.more.replace('{n}', String(PDF_PREVIEW_PAGES)) : null;

/** RN core only for OTA; tapping a page opens PhotoViewer, as zooming the list takes the scroll. */
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
