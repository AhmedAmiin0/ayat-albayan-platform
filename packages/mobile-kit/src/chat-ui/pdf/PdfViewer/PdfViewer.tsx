import { FlatList, Modal, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../../ui/primitives/AppText';
import { PhotoViewer } from '../../photo/PhotoViewer';
import { ViewerClose } from '../../photo/ViewerClose';
import { ViewerFooter } from '../../photo/ViewerFooter';
import { PdfViewerHead } from '../PdfViewerHead';
import { PDF_LINE } from '../use-current-page';
import type { PdfViewerProps } from './PdfViewer.types';
import { usePdfViewer } from './use-pdf-viewer';

/** RN core only for OTA; tapping a page opens PhotoViewer, as zooming the list takes the scroll. */
export function PdfViewer({ name, meta, pages, renderPage, footer, onClose }: PdfViewerProps) {
  const { still, zoomed, setZoomed, current, onViewable, viewability, shown, more } = usePdfViewer({
    pages,
  });
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
