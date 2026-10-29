import { type MessageView, pdfMetaLine } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ContentText } from '@/core/ui/primitives/ContentText';
import { DownloadLink } from '../copy-download/DownloadLink';
import { useSmall } from '../components/MessageMeta';
import { finalError, pdfPageQuery } from '../hooks/thread-file';
import { MediaNote, problemText } from './MediaNote';
import { mediaProblem } from './media-problem';
import { A4, imageRatio } from './PdfPage';
import { PdfBadge, PdfStrip } from './PdfStrip';
import { PdfViewer } from './PdfViewer';

interface PdfPreviewProps {
  message: MessageView;
  phone: string;
  kind: string;
  /** The bubble's menu («رد», «إعادة توجيه»): the card takes the touch, so it opens it too. */
  onLongPress?: () => void;
  /** Today's opener, for a 4xx only: a PDF with no preview (422), a bad request (400). */
  fallback: ReactNode;
}

/** The card's width: page 1 fills it from its top (as WhatsApp). */
const WIDTH = 240;

/** The PDFs whose thumb was re-signed once after a failed load, by message: kept across a remount. */
const resigned = new Set<string>();

/**
 * Staff sent it from the platform (sender_name: never an echo, an import or a family's file; a teacher
 * sends no files; not a forward, which may be a family's), so page 1 renders as the bubble shows. Any
 * other PDF waits for a tap: poppler parses the sender's bytes inside the API (docs/09 «Known risk»).
 */
const staffSent = (m: MessageView): boolean => m.direction === 'outbound' && Boolean(m.sender_name) && !m.forwarded;
/** Page 1 was asked before: an answer or a failure in the cache (a disabled query's entry is still pending). */
const askedBefore = (state: { status: string } | undefined): boolean => state !== undefined && state.status !== 'pending';

/**
 * A chat PDF like WhatsApp's (owner 2026-10-29): the top of page 1, a «PDF» badge, the name and
 * «12 صفحة · PDF · 1.2 ميغابايت»; a tap opens every page in the app (PdfViewer), «تنزيل» saves it.
 * The strip keeps one height (PdfStrip): a large «PDF» and «اضغط لمعاينة الملف» until a tap asks
 * page 1, a spinner until its image has loaded, a large «PDF» when the image fails after one re-sign,
 * «تعذّر تحميل الصفحة» after a 5xx or no network (a tap asks again). Only a 4xx leaves the card.
 */
export function PdfPreview({ message: m, phone, kind, onLongPress, fallback }: PdfPreviewProps) {
  const { color } = useTheme();
  const small = useSmall();
  const client = useQueryClient();
  const query = pdfPageQuery(phone, m.id, 1);
  // Asked once: a remount (a scroll back) shows and re-signs it with no second tap.
  const [asked, setAsked] = useState(() => staffSent(m) || askedBefore(client.getQueryState(query.queryKey)));
  const first = useQuery({ ...query, enabled: asked });
  const [noThumb, setNoThumb] = useState(false);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [ratio, setRatio] = useState(A4);
  const [open, setOpen] = useState(false);
  // `?? null`: a test (or a proxy) may answer null, which TanStack keeps as data.
  const doc = first.data ?? null;
  if (!doc && first.error && finalError(first.error)) {
    const text = problemText(mediaProblem(first.error), kind);
    return text ? <MediaNote text={text} /> : <>{fallback}</>;
  }
  const failed = !doc && first.error !== null && !first.isFetching;
  const uri = doc && !noThumb ? doc.url : null;
  const waiting = uri ? loaded !== uri : asked && !doc && !failed;
  const note = uri || waiting ? null : !asked ? t.inbox.pdf.tapToPreview : failed ? t.inbox.pdf.pageFailed : '';
  const name = m.media_name ?? kind;
  const meta = doc ? pdfMetaLine(doc, t.inbox.pdf) : waiting ? t.common.loading : kind;
  const onError = () => {
    if (resigned.has(m.id)) return setNoThumb(true);
    resigned.add(m.id);
    void client.invalidateQueries({ queryKey: query.queryKey, exact: true });
  };
  // One tap asks page 1 (or asks again after a failure) and opens the viewer once it answers.
  const show = () => {
    setAsked(true);
    setOpen(true);
    if (failed) void first.refetch();
  };
  return (
    <View style={{ gap: 2 }}>
      <Pressable
        testID={`pdf-${m.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${t.inbox.pdf.open.replace('{name}', name)} · ${meta}`}
        accessibilityHint={note || undefined}
        accessibilityState={{ busy: waiting }}
        onPress={show}
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
        <PdfStrip waiting={waiting} note={note}>
          {uri ? (
            <Image
              // A re-signed URL is a new image: mount it afresh so its own load or error is heard.
              key={first.dataUpdatedAt}
              testID={`pdf-thumb-${m.id}`}
              source={{ uri }}
              resizeMode="cover"
              // Android decodes the 1600 px page down to the card, not at full size.
              resizeMethod="resize"
              accessibilityIgnoresInvertColors
              onLoad={(e) => {
                setRatio(imageRatio(e.nativeEvent.source));
                setLoaded(uri);
              }}
              onError={onError}
              // Full width from the top in the page's own shape: a landscape page is never cut at the sides.
              style={{ position: 'absolute', top: 0, width: WIDTH, height: Math.round(WIDTH * ratio) }}
            />
          ) : null}
        </PdfStrip>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 }}>
          <PdfBadge />
          <View style={{ flex: 1, gap: 2 }}>
            <ContentText
              source={name}
              numberOfLines={2}
              style={{ fontFamily: type.ui[600], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink }}
            >
              {name}
            </ContentText>
            <AppText numberOfLines={1} style={small}>{meta}</AppText>
          </View>
        </View>
      </Pressable>
      <DownloadLink message={m} phone={phone} />
      {open && doc ? <PdfViewer message={m} phone={phone} doc={doc} name={name} onClose={() => setOpen(false)} /> : null}
    </View>
  );
}
