import { ActivityIndicator, Image, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { palette, shape, type } from '../../theme';
import { AppText } from '../../ui/primitives/AppText';
import { usePdfPage } from './use-pdf-page';

export interface PdfZoom {
  uri: string;
  label: string;
}

export interface PdfPageProps {
  page: number;
  pages: number;
  /** The page image's URL once the caller has it. */
  url?: string;
  /** The caller could not get the URL (and holds none). */
  failed: boolean;
  /** Changes whenever the URL is fetched anew: the image loads again. */
  version?: number;
  /** Ask for the URL again (a tap on a page that failed). */
  onRetry: () => void;
  /** A tap: the page full screen, to pinch and pan (PhotoViewer). */
  onZoom: (shown: PdfZoom) => void;
}

const BOX = {
  minHeight: shape.control.touch,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: palette.dark.sunk,
} as const;
const FAILED = { fontFamily: type.ui[600], fontSize: type.size.sm, color: palette.dark.ink };

const pageLabel = (page: number, pages: number): string =>
  t.inbox.pdf.pageOf.replace('{n}', String(page)).replace('{total}', String(pages));

/**
 * One page in the PDF viewer, asked only when the list renders it (near the
 * screen). The box keeps the A4 shape until the image loads, then its own; a spinner stays until
 * the image itself has loaded, not just its URL. A page that fails says so; a tap asks again.
 */
export function PdfPage(p: PdfPageProps) {
  const width = useWindowDimensions().width - 16;
  const label = pageLabel(p.page, p.pages);
  const page = usePdfPage(p, label);
  const failed = page.failed;
  return (
    <Pressable
      testID={`pdf-page-${p.page}`}
      accessibilityRole={failed ? 'button' : 'imagebutton'}
      accessibilityLabel={failed ? t.inbox.pdf.pageFailed : label}
      accessibilityHint={failed ? undefined : t.inbox.pdf.zoomHint}
      accessibilityState={{ busy: page.waiting }}
      onPress={page.onPress}
      style={{ ...BOX, width, height: width * page.ratio }}
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
      {failed ? (
        <AppText style={{ ...FAILED, paddingHorizontal: 16 }}>{t.inbox.pdf.pageFailed}</AppText>
      ) : null}
      {page.waiting ? (
        <ActivityIndicator accessibilityLabel={t.common.loading} color={palette.dark.ink2} />
      ) : null}
    </Pressable>
  );
}
