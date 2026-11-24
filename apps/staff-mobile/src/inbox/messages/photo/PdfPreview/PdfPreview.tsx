import { type MessageView, pdfBubbleName, pdfMetaLine } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import {
  t,
  shape,
  type,
  useTheme,
  AppText,
  useSmallText,
  A4,
  imageRatio,
  PdfBadge,
  PdfStrip,
} from '@ab/mobile-kit';
import { ContentText } from '@/core/ui/primitives/ContentText';
import { DownloadLink } from '@/inbox/messages/copy-download/DownloadLink';
import { finalError, pdfPageQuery } from '@/inbox/messages/hooks/thread-file';
import { useSeen } from '@/inbox/messages/hooks/seen-rows';
import { MediaNote, problemText } from '@/inbox/messages/photo/MediaNote';
import { mediaProblem } from '@/inbox/messages/photo/media-problem';
import { ThreadPdfViewer } from '@/inbox/messages/photo/ThreadPdfViewer';

interface PdfPreviewProps {
  message: MessageView;
  phone: string;
  kind: string;
  /** The card takes the touch, so it also opens the bubble menu. */
  onLongPress?: () => void;
  /** Today's opener, for a 4xx only: a PDF with no preview (422), a bad request (400). */
  fallback: ReactNode;
}

/** The card's width: page 1 fills it from its top (as WhatsApp). */
const WIDTH = 240;

/** The PDFs whose thumb was re-signed once after a failed load, by message: kept across a remount. */
const resigned = new Set<string>();

/** Page 1 is asked once on screen (useSeen) so long threads never burst; a 4xx drops the card. */
export function PdfPreview({ message: m, phone, kind, onLongPress, fallback }: PdfPreviewProps) {
  const { color } = useTheme();
  const small = useSmallText();
  const client = useQueryClient();
  const query = pdfPageQuery(phone, m.id, 1);
  const first = useQuery({ ...query, enabled: useSeen(m.id) });
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
  const waiting = uri ? loaded !== uri : !doc && !failed;
  const note = uri || waiting ? null : failed ? t.inbox.pdf.pageFailed : '';
  const name = pdfBubbleName(m, t.inbox.pdf.untitled);
  // Never the name twice («File / File»): «PDF» until page 1 tells the count and size.
  const meta = doc ? pdfMetaLine(doc, t.inbox.pdf) : t.inbox.pdf.type;
  const onError = () => {
    if (resigned.has(m.id)) return setNoThumb(true);
    resigned.add(m.id);
    void client.invalidateQueries({ queryKey: query.queryKey, exact: true });
  };
  // After a page-load failure a tap only retries; a viewer must never open by itself later.
  const show = () => {
    setOpen(!failed);
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
      {open && doc ? <ThreadPdfViewer message={m} phone={phone} doc={doc} name={name} onClose={() => setOpen(false)} /> : null}
    </View>
  );
}
