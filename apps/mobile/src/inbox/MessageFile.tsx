import { baseMime, isPlayableMime, type MessageView } from '@ab/shared';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { AudioPlayer } from './AudioPlayer';
import { mediaKind } from './message-text';
import { useSmall } from './MessageMeta';
import { type ThreadFile, useThreadFile } from './thread-file';
import { useThreadMode } from './thread/hooks/thread-mode';
import { VideoPlayer } from './VideoPlayer';

type State =
  | { step: 'idle' | 'loading' | 'expired' | 'forbidden' | 'failed' }
  | { step: 'loaded'; file: ThreadFile };

/** 410: imported history or a purged voice note; 403: a role that may not open files. */
function problemOf(e: unknown): State {
  if (e instanceof ApiError && e.status === 410) return { step: 'expired' };
  if (e instanceof ApiError && e.status === 403) return { step: 'forbidden' };
  return { step: 'failed' };
}

function Note({ text }: { text: string }) {
  const small = useSmall();
  return (
    <AppText accessibilityRole="text" style={{ ...small, fontFamily: type.ui[600] }}>
      {text}
    </AppText>
  );
}

function Player({ file, kind }: { file: ThreadFile; kind: string }) {
  if (baseMime(file.mime).startsWith('video/')) return <VideoPlayer url={file.url} kind={kind} />;
  return <AudioPlayer url={file.url} kind={kind} />;
}

/** Asked only on the tap: rendering or refetching the thread never signs a URL (W6). */
function FileOpener({ message: m, phone, kind }: { message: MessageView; phone: string; kind: string }) {
  const { color } = useTheme();
  const small = useSmall();
  const fetchFile = useThreadFile(phone, m.id);
  const [state, setState] = useState<State>({ step: 'idle' });
  const playable = isPlayableMime(m.media_mime);

  const open = async () => {
    setState({ step: 'loading' });
    try {
      const file = await fetchFile();
      if (playable) return setState({ step: 'loaded', file });
      setState({ step: 'idle' });
      await Linking.openURL(file.url);
    } catch (e) {
      setState(problemOf(e));
    }
  };

  if (state.step === 'loaded') return <Player file={state.file} kind={kind} />;
  if (state.step === 'expired') return <Note text={t.inbox.mediaExpired} />;
  if (state.step === 'forbidden') return <Note text={`${kind} · ${t.inbox.mediaNotAllowed}`} />;
  const busy = state.step === 'loading';
  const label = (playable ? t.inbox.playMedia : t.inbox.viewMedia).replace('{kind}', kind);
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
      {state.step === 'failed' ? <AppText accessibilityRole="alert" style={small}>{t.common.error}</AppText> : null}
    </View>
  );
}

/**
 * A bubble's photo, PDF, voice note or video (owner 2026-10-19 #1, W6), ours or theirs: «عرض صورة»
 * opens a photo or PDF in the phone's viewer; «تشغيل رسالة صوتية» / «تشغيل فيديو» plays it inside
 * the bubble. A teacher gets the label only: the API refuses her the file (403 media_forbidden),
 * so no request is made.
 */
export function MessageFile({ message: m, phone }: { message: MessageView; phone: string }) {
  const teacher = useThreadMode().kind === 'teacher';
  const kind = t.inbox.media[mediaKind(m.media_mime)];
  if (teacher) return <Note text={`${kind} · ${t.inbox.mediaNotAllowed}`} />;
  return <FileOpener message={m} phone={phone} kind={kind} />;
}
