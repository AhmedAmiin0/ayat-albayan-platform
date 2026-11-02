import { baseMime, isGifMessage, isPdfMime, isPlayableMime, type MessageView } from '@ab/shared';
import { type ReactNode, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { DownloadLink } from '@/inbox/messages/copy-download/DownloadLink';
import { mediaKind } from '@/inbox/messages/hooks/message-text';
import { useSmall } from './MessageMeta';
import { useThreadFile } from '@/inbox/messages/hooks/thread-file';
import { useThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { VideoTile } from '@/inbox/messages/media/VideoTile';
import { VoiceNote } from '@/inbox/messages/media/VoiceNote';
import { MediaNote, problemText } from '@/inbox/messages/photo/MediaNote';
import { mediaProblem, type MediaProblem, photoBox } from '@/inbox/messages/photo/media-problem';
import { PdfPreview } from '@/inbox/messages/photo/PdfPreview';
import { PhotoPreview } from '@/inbox/messages/photo/PhotoPreview';
import { GifBubble } from '@/inbox/messages/media/gif/GifBubble';

type State = { step: 'idle' | 'loading' } | { step: 'problem'; problem: MediaProblem };

/**
 * Asked only on the tap (W6): the file opens in the phone's viewer. HEIC, and a PDF the preview
 * cannot show (PdfPreview's fallback on a 4xx: no preview, a bad request).
 */
function FileOpener({ message: m, phone, kind }: { message: MessageView; phone: string; kind: string }) {
  const { color } = useTheme();
  const small = useSmall();
  const fetchFile = useThreadFile(phone, m.id);
  const [state, setState] = useState<State>({ step: 'idle' });

  const open = async () => {
    setState({ step: 'loading' });
    try {
      const file = await fetchFile();
      setState({ step: 'idle' });
      await Linking.openURL(file.url);
    } catch (e) {
      setState({ step: 'problem', problem: mediaProblem(e) });
    }
  };

  const ended = state.step === 'problem' ? problemText(state.problem, kind) : null;
  if (ended) return <MediaNote text={ended} />;
  const busy = state.step === 'loading';
  const label = t.inbox.viewMedia.replace('{kind}', kind);
  return (
    <View style={{ gap: 2 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        onPress={() => void open()}
        style={{ minHeight: shape.control.touch, justifyContent: 'center' }}
      >
        <AppText
          style={{
            fontFamily: type.ui[600],
            fontSize: type.size.sm,
            lineHeight: type.lineHeight(type.size.sm),
            color: color.lapis,
            textDecorationLine: 'underline',
          }}
        >
          {busy ? t.common.loading : label}
        </AppText>
      </Pressable>
      {m.media_name ? <AppText style={small}>{m.media_name}</AppText> : null}
      <DownloadLink message={m} phone={phone} />
      {state.step === 'problem' ? <AppText accessibilityRole="alert" style={small}>{t.common.error}</AppText> : null}
    </View>
  );
}

interface MessageFileProps {
  message: MessageView;
  phone: string;
  /** The bubble's menu, for a thumbnail that takes the long press. */
  onLongPress?: () => void;
}

interface ViewProps extends MessageFileProps {
  kind: string;
}

/** A playable audio file is a voice note (as on WhatsApp); any other playable one, a video. */
const isAudio = (mime: string | null): boolean =>
  isPlayableMime(mime) && baseMime(mime).startsWith('audio/');

/**
 * In order, the first view that takes the file; none → «عرض …» (FileOpener). A GIF (owner
 * 2026-11-01) plays inline, muted and looping, before any other video.
 */
const MEDIA_VIEWS: readonly ((p: ViewProps) => ReactNode)[] = [
  (p) => {
    const box = photoBox(p.message.media_mime);
    return box ? <PhotoPreview {...p} box={box} /> : null;
  },
  (p) => (isGifMessage(p.message) ? <GifBubble {...p} kind={t.inbox.media.gif} /> : null),
  (p) => (isAudio(p.message.media_mime) ? <VoiceNote {...p} /> : null),
  (p) => (isPlayableMime(p.message.media_mime) ? <VideoTile {...p} /> : null),
  (p) => {
    const opener = <FileOpener {...p} />;
    return isPdfMime(p.message.media_mime) ? <PdfPreview {...p} fallback={opener} /> : null;
  },
];

function MediaView(p: ViewProps) {
  for (const view of MEDIA_VIEWS) {
    const shown = view(p);
    if (shown) return shown;
  }
  return <FileOpener {...p} />;
}

/**
 * A bubble's photo, PDF, voice note or video (owner 2026-10-19 #1, W6), ours or theirs. A photo shows
 * its thumbnail as the bubble renders (PhotoPreview, owner 2026-10-26: supersedes W6's «signed only on
 * the tap» for photos), and so does every PDF its first page once on screen (PdfPreview, owner
 * 2026-10-29 / 2026-11-01, rendered in the ayat-pdf sandbox); HEIC keeps
 * «عرض صورة» (Android does not decode it reliably), which opens it in the phone's viewer; a voice note
 * and a video look as on WhatsApp (owner 2026-10-27: VoiceNote, VideoTile); «تنزيل» under each saves it
 * (DownloadLink). A teacher gets the label only: the API refuses the file (403 media_forbidden; a photo
 * may be a payment proof), so no request is made.
 */
export function MessageFile({ message: m, phone, onLongPress }: MessageFileProps) {
  const teacher = useThreadMode().kind === 'teacher';
  const kind = t.inbox.media[mediaKind(m.media_mime)];
  if (teacher) return <MediaNote text={`${kind} · ${t.inbox.mediaNotAllowed}`} />;
  return <MediaView message={m} phone={phone} kind={kind} onLongPress={onLongPress} />;
}
