import { baseMime, isPlayableMime, type MessageView } from '@ab/shared';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { DownloadLink } from '../copy-download/DownloadLink';
import { mediaKind } from '../hooks/message-text';
import { useSmall } from './MessageMeta';
import { useThreadFile } from '../hooks/thread-file';
import { useThreadMode } from '../../thread/hooks/thread-mode';
import { VideoTile } from '../media/VideoTile';
import { VoiceNote } from '../media/VoiceNote';
import { MediaNote, problemText } from '../photo/MediaNote';
import { mediaProblem, type MediaProblem, photoBox } from '../photo/media-problem';
import { PhotoPreview } from '../photo/PhotoPreview';

type State = { step: 'idle' | 'loading' } | { step: 'problem'; problem: MediaProblem };

/** Asked only on the tap: rendering or refetching the thread never signs a PDF (W6); it opens in the phone's viewer. */
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

/**
 * A bubble's photo, PDF, voice note or video (owner 2026-10-19 #1, W6), ours or theirs. A photo shows
 * its thumbnail as the bubble renders (PhotoPreview, owner 2026-10-26: supersedes W6's «signed only on
 * the tap» for photos only); HEIC keeps «عرض صورة» (Android does not decode it reliably), which opens
 * it in the phone's viewer as a PDF does; a voice note and a video look as on WhatsApp (owner
 * 2026-10-27: VoiceNote, VideoTile); «تنزيل» under each saves it (DownloadLink). A teacher gets the label only: the API refuses
 * the file (403 media_forbidden; a photo may be a payment proof), so no request is made.
 */
export function MessageFile({ message: m, phone, onLongPress }: MessageFileProps) {
  const teacher = useThreadMode().kind === 'teacher';
  const kind = t.inbox.media[mediaKind(m.media_mime)];
  if (teacher) return <MediaNote text={`${kind} · ${t.inbox.mediaNotAllowed}`} />;
  const box = photoBox(m.media_mime);
  if (box) return <PhotoPreview message={m} phone={phone} box={box} kind={kind} onLongPress={onLongPress} />;
  const playable = isPlayableMime(m.media_mime);
  if (playable && baseMime(m.media_mime).startsWith('audio/')) return <VoiceNote message={m} phone={phone} kind={kind} />;
  if (playable) return <VideoTile message={m} phone={phone} kind={kind} />;
  return <FileOpener message={m} phone={phone} kind={kind} />;
}
