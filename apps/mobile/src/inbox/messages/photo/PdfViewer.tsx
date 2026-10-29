import { type MessageView, PDF_PREVIEW_PAGES, pdfMetaLine, type ThreadPdfPage } from '@ab/shared';
import { useState } from 'react';
import { FlatList, Modal, StatusBar, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '@/core/lib/i18n/i18n';
import { palette, shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ContentText } from '@/core/ui/primitives/ContentText';
import { useA11yPref } from '@/core/ui/primitives/use-a11y-pref';
import { DownloadLink } from '../copy-download/DownloadLink';
import { PdfPage } from './PdfPage';
import { PhotoViewer } from './PhotoViewer';
import { ViewerClose } from './ViewerClose';

interface PdfViewerProps {
  message: MessageView;
  phone: string;
  /** Page 1's answer (the bubble's cache): the page count and size. */
  doc: ThreadPdfPage;
  name: string;
  onClose: () => void;
}

const line = { fontFamily: type.ui[500], fontSize: type.size['2xs'], lineHeight: type.lineHeight(type.size['2xs']), color: palette.dark.ink2 };
/** The page in view: the first one at least half on screen (a fixed object: the list refuses a new one). */
const VIEWABLE = { itemVisiblePercentThreshold: 50 };

/**
 * A chat PDF full screen (owner 2026-10-29), RN core only (the APK updates by OTA): black, «إغلاق»,
 * the name, «12 صفحة · PDF · 1.2 ميغابايت», «صفحة 3 من 12» (the page in view) and «اضغط على الصفحة
 * لتكبيرها», then the pages one under another, each asked only when the list nears it (page 1 is the
 * bubble's). A tap on a page opens it in PhotoViewer to pinch and pan: a zoom on the list itself would
 * take the scroll. Past PDF_PREVIEW_PAGES, a line says to download the file; «تنزيل» below saves the
 * PDF itself. Android's back closes it.
 */
export function PdfViewer({ message: m, phone, doc, name, onClose }: PdfViewerProps) {
  const { color } = useTheme();
  const still = useA11yPref('reduceMotion');
  const [zoomed, setZoomed] = useState<{ uri: string; label: string } | null>(null);
  const [current, setCurrent] = useState(1);
  // The same function for the list's whole life (a new one on a render would throw): a state's first value,
  // never read from a ref during render.
  const [onViewable] = useState(() => ({ viewableItems }: { viewableItems: ViewToken<number>[] }) => {
    const shown = viewableItems[0]?.item;
    if (typeof shown === 'number') setCurrent(shown);
  });
  const pages = Array.from({ length: Math.min(doc.pages, PDF_PREVIEW_PAGES) }, (_, i) => i + 1);
  const more = doc.pages > PDF_PREVIEW_PAGES ? t.inbox.pdf.more.replace('{n}', String(PDF_PREVIEW_PAGES)) : null;
  return (
    <Modal testID="pdf-viewer" visible animationType={still ? 'none' : 'fade'} statusBarTranslucent onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: 'black' }}>
        <ViewerClose onClose={onClose} />
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <ContentText source={name} numberOfLines={1} style={{ ...line, fontFamily: type.ui[600], fontSize: type.size.sm, color: palette.dark.ink }}>
            {name}
          </ContentText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12 }}>
            <AppText style={line}>{pdfMetaLine(doc, t.inbox.pdf)}</AppText>
            <AppText testID="pdf-current" style={line}>
              {t.inbox.pdf.pageOf.replace('{n}', String(current)).replace('{total}', String(doc.pages))}
            </AppText>
          </View>
          <AppText style={line}>{t.inbox.pdf.zoomHint}</AppText>
        </View>
        <FlatList
          testID="pdf-pages"
          data={pages}
          keyExtractor={(n) => String(n)}
          renderItem={({ item }) => <PdfPage message={m} phone={phone} page={item} pages={doc.pages} onZoom={setZoomed} />}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={3}
          viewabilityConfig={VIEWABLE}
          onViewableItemsChanged={onViewable}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 8, paddingBottom: 8 }}
          ListFooterComponent={more ? <AppText style={{ ...line, paddingHorizontal: 8 }}>{more}</AppText> : null}
        />
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <View style={{ paddingHorizontal: 16, borderRadius: shape.radius.lg, backgroundColor: color.raised }}>
            <DownloadLink message={m} phone={phone} />
          </View>
        </View>
      </SafeAreaView>
      {zoomed ? <PhotoViewer uri={zoomed.uri} label={zoomed.label} message={m} phone={phone} onClose={() => setZoomed(null)} /> : null}
    </Modal>
  );
}
