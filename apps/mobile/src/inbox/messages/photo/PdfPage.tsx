import type { MessageView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { palette, shape, type } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { pdfPageQuery } from '../hooks/thread-file';

/** An A4 page's height over its width: the page's box until its image says its own. */
export const A4 = 1.414;

interface PdfPageProps {
  message: MessageView;
  phone: string;
  page: number;
  /** The PDF's page count, for «صفحة 3 من 12». */
  pages: number;
  /** A tap: the page full screen, to pinch and pan (PhotoViewer). */
  onZoom: (shown: { uri: string; label: string }) => void;
}

/**
 * One page in the PDF viewer (owner 2026-10-29), asked only when the list renders it (near the
 * screen). The box keeps the A4 shape until the image loads, then its own. A page that fails says so;
 * a tap asks again.
 */
export function PdfPage({ message: m, phone, page, pages, onZoom }: PdfPageProps) {
  const width = useWindowDimensions().width - 16;
  const answer = useQuery(pdfPageQuery(phone, m.id, page));
  const [ratio, setRatio] = useState(A4);
  const [broken, setBroken] = useState(false);
  const label = t.inbox.pdf.pageOf.replace('{n}', String(page)).replace('{total}', String(pages));
  const uri = broken ? undefined : answer.data?.url;
  const failed = broken || (!answer.data && answer.error !== null);
  const retry = () => {
    setBroken(false);
    void answer.refetch();
  };
  return (
    <Pressable
      testID={`pdf-page-${page}`}
      accessibilityRole={failed ? 'button' : 'imagebutton'}
      accessibilityLabel={failed ? t.inbox.pdf.pageFailed : label}
      accessibilityState={{ busy: !uri && !failed }}
      onPress={failed ? retry : uri ? () => onZoom({ uri, label }) : undefined}
      style={{
        width,
        height: width * ratio,
        minHeight: shape.control.touch,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.dark.sunk,
      }}
    >
      {uri ? (
        <Image
          key={answer.dataUpdatedAt}
          testID={`pdf-page-image-${page}`}
          source={{ uri }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          onLoad={(e) => {
            const { width: w, height: h } = e.nativeEvent.source;
            if (w > 0 && h > 0) setRatio(h / w);
          }}
          onError={() => setBroken(true)}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {failed ? (
        <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: palette.dark.ink, paddingHorizontal: 16 }}>
          {t.inbox.pdf.pageFailed}
        </AppText>
      ) : null}
      {!uri && !failed ? <ActivityIndicator accessibilityLabel={t.common.loading} color={palette.dark.ink2} /> : null}
    </Pressable>
  );
}
