import { type MessageView, pdfMetaLine } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { DownloadLink } from '../copy-download/DownloadLink';
import { useSmall } from '../components/MessageMeta';
import { pdfPageQuery } from '../hooks/thread-file';
import { MediaNote, problemText } from './MediaNote';
import { mediaProblem } from './media-problem';
import { A4 } from './PdfPage';
import { PdfViewer } from './PdfViewer';

interface PdfPreviewProps {
  message: MessageView;
  phone: string;
  kind: string;
  /** The bubble's menu («رد», «إعادة توجيه»): the card takes the touch, so it opens it too. */
  onLongPress?: () => void;
  /** Today's opener: a PDF with no preview (422), a render still failing after the retries (503), any other failure. */
  fallback: ReactNode;
}

/** The card's width and the strip of page 1 it shows (its top, as WhatsApp). */
const WIDTH = 240;
const STRIP = 120;

/** The PDFs whose thumb was re-signed once after a failed load, by message: kept across a remount. */
const resigned = new Set<string>();

/** «PDF» on the card, white on the brand green. */
function Badge() {
  const { color } = useTheme();
  return (
    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: shape.radius.sm, backgroundColor: color.lapisFill }}>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size['2xs'], lineHeight: type.lineHeight(type.size['2xs']), color: color.onLapis }}>
        {t.inbox.pdf.type}
      </AppText>
    </View>
  );
}

/**
 * A chat PDF like WhatsApp's (owner 2026-10-29): the top of page 1, a «PDF» badge, the name and
 * «12 صفحة · PDF · 1.2 ميغابايت»; a tap opens every page in the app (PdfViewer), «تنزيل» saves it.
 * Page 1 is asked as the bubble renders (as PhotoPreview); the box is fixed, so the inverted list never
 * jumps when it loads. A thumb that fails to load is re-signed once, then the card goes on without it.
 */
export function PdfPreview({ message: m, phone, kind, onLongPress, fallback }: PdfPreviewProps) {
  const { color } = useTheme();
  const small = useSmall();
  const query = pdfPageQuery(phone, m.id, 1);
  const first = useQuery(query);
  const client = useQueryClient();
  const [noThumb, setNoThumb] = useState(false);
  const [open, setOpen] = useState(false);
  // `?? null`: a test (or a proxy) may answer null, which TanStack keeps as data.
  const doc = first.data ?? null;
  if (!doc && first.error) {
    const text = problemText(mediaProblem(first.error), kind);
    return text ? <MediaNote text={text} /> : <>{fallback}</>;
  }
  const name = m.media_name ?? kind;
  const meta = doc ? pdfMetaLine(doc, t.inbox.pdf) : t.common.loading;
  const onError = () => {
    if (resigned.has(m.id)) return setNoThumb(true);
    resigned.add(m.id);
    void client.invalidateQueries({ queryKey: query.queryKey, exact: true });
  };
  return (
    <View style={{ gap: 2 }}>
      <Pressable
        testID={`pdf-${m.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${t.inbox.pdf.open.replace('{name}', name)} · ${meta}`}
        accessibilityState={{ busy: !doc, disabled: !doc }}
        onPress={() => (doc ? setOpen(true) : undefined)}
        onLongPress={onLongPress}
        delayLongPress={350}
        style={{
          width: WIDTH,
          minHeight: shape.control.touch,
          overflow: 'hidden',
          borderRadius: shape.radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: color.rule,
          backgroundColor: color.sunk,
        }}
      >
        <View style={{ height: STRIP, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: color.raised }}>
          {doc && !noThumb ? (
            <Image
              // A re-signed URL is a new image: mount it afresh so its own load or error is heard.
              key={first.dataUpdatedAt}
              testID={`pdf-thumb-${m.id}`}
              source={{ uri: doc.url }}
              resizeMode="cover"
              // Android decodes the 1600 px page down to the card, not at full size.
              resizeMethod="resize"
              accessibilityIgnoresInvertColors
              onError={onError}
              style={{ position: 'absolute', top: 0, width: WIDTH, height: Math.round(WIDTH * A4) }}
            />
          ) : null}
          {doc ? null : <ActivityIndicator accessibilityLabel={t.common.loading} color={color.ink3} />}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 }}>
          <Badge />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText numberOfLines={2} style={{ fontFamily: type.ui[600], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink }}>
              {name}
            </AppText>
            <AppText numberOfLines={1} style={small}>{meta}</AppText>
          </View>
        </View>
      </Pressable>
      <DownloadLink message={m} phone={phone} />
      {open && doc ? <PdfViewer message={m} phone={phone} doc={doc} name={name} onClose={() => setOpen(false)} /> : null}
    </View>
  );
}
