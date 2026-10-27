import type { MessageView } from '@ab/shared';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { palette, shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { useSmall } from '../components/MessageMeta';
import { DownloadLink } from '../copy-download/DownloadLink';
import { MediaNote, problemText } from '../photo/MediaNote';
import { PlayIcon } from '../../shared/chat-icons';
import { Spinner } from './Spinner';
import { useFileOnTap } from './use-file-on-tap';
import { VideoModal } from './VideoModal';

/** Fixed, so the inverted list never jumps (as photoBox); about WhatsApp's video bubble. */
export const VIDEO_TILE = { width: 220, height: 160 } as const;
const PLAY = 56;

/**
 * A video as WhatsApp shows it (owner 2026-10-27): a dark tile, a big round play button and «فيديو»;
 * the tap fetches it (W6: never before) and opens it full screen (VideoModal). The caption stays under
 * the bubble's file (MessageBubble); a failure stays in the bubble, «اضغط لإعادة المحاولة».
 */
export function VideoTile({ message: m, phone, kind }: { message: MessageView; phone: string; kind: string }) {
  const { color } = useTheme();
  const small = useSmall();
  const { state, open, fail } = useFileOnTap(phone, m.id);
  const [shown, setShown] = useState(false);
  const ended = state.step === 'problem' ? problemText(state.problem, kind) : null;
  if (ended) return <MediaNote text={ended} />;
  const play = () => {
    setShown(true);
    open();
  };
  const failed = () => {
    setShown(false);
    fail();
  };
  return (
    <View style={{ gap: 2 }}>
      <Pressable
        testID="video-tile"
        accessibilityRole="button"
        accessibilityLabel={t.inbox.playMedia.replace('{kind}', kind)}
        accessibilityState={{ busy: state.step === 'fetching' }}
        onPress={play}
        style={{
          ...VIDEO_TILE,
          maxWidth: '100%',
          borderRadius: shape.radius.md,
          backgroundColor: palette.light.inverse,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: PLAY, height: PLAY, borderRadius: PLAY / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: color.lapisFill }}>
          {state.step === 'fetching' ? <Spinner color={color.onLapis} /> : <PlayIcon color={color.onLapis} size={28} />}
        </View>
        <AppText style={{ position: 'absolute', bottom: 8, start: 10, fontFamily: type.ui[600], fontSize: type.size.xs, color: palette.dark.ink }}>
          {kind}
        </AppText>
      </Pressable>
      {state.step === 'problem' ? (
        <AppText accessibilityRole="alert" style={small}>
          {t.inbox.mediaFailed}
        </AppText>
      ) : null}
      <DownloadLink message={m} phone={phone} />
      {shown && state.step === 'ready' ? (
        <VideoModal id={m.id} url={state.file.url} kind={kind} onClose={() => setShown(false)} onFail={failed} />
      ) : null}
    </View>
  );
}
