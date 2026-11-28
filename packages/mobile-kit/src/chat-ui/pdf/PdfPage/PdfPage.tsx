import { ActivityIndicator, Image, Pressable, StyleSheet } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { palette } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { BOX, FAILED } from './pdf-page.helpers';
import type { PdfPageProps } from './PdfPage.types';
import { usePdfPage } from './use-pdf-page';

/**
 * One page in the PDF viewer, asked only when the list renders it (near the
 * screen). The box keeps the A4 shape until the image loads, then its own; a spinner stays until
 * the image itself has loaded, not just its URL. A page that fails says so; a tap asks again.
 */
export function PdfPage(p: PdfPageProps) {
  const page = usePdfPage(p);
  return (
    <Pressable
      testID={`pdf-page-${p.page}`}
      accessibilityRole={page.failed ? 'button' : 'imagebutton'}
      accessibilityLabel={page.failed ? t.inbox.pdf.pageFailed : page.label}
      accessibilityHint={page.failed ? undefined : t.inbox.pdf.zoomHint}
      accessibilityState={{ busy: page.waiting }}
      onPress={page.onPress}
      style={{ ...BOX, width: page.width, height: page.height }}
    >
      {page.uri ? (
        <Image
          key={p.version}
          testID={`pdf-page-image-${p.page}`}
          source={{ uri: page.uri }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          onLoad={page.onLoad}
          onError={page.onError}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {page.failed ? (
        <AppText style={{ ...FAILED, paddingHorizontal: 16 }}>{t.inbox.pdf.pageFailed}</AppText>
      ) : null}
      {page.waiting ? (
        <ActivityIndicator accessibilityLabel={t.common.loading} color={palette.dark.ink2} />
      ) : null}
    </Pressable>
  );
}
