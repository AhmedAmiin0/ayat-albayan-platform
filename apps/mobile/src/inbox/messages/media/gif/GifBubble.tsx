import type { MessageView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, StyleSheet } from 'react-native';
import { palette, shape } from '@/theme';
import { useA11yPref } from '@/core/ui/primitives/use-a11y-pref';
import { threadFileQuery } from '@/inbox/messages/hooks/thread-file';
import { Spinner } from '@/inbox/messages/media/Spinner';
import { VIDEO_TILE } from '@/inbox/messages/media/VideoTile';
import { MediaNote, problemText, RetryLine } from '@/inbox/messages/photo/MediaNote';
import { mediaProblem } from '@/inbox/messages/photo/media-problem';

interface GifBubbleProps {
  message: MessageView;
  phone: string;
  kind: string;
  onLongPress?: (() => void) | undefined;
}

/**
 * Plays as WhatsApp plays a GIF: muted and looping, inline. A TextureView, not Android's
 * SurfaceView: the chat is an inverted list, which a SurfaceView would show upside down. With
 * «Reduce Motion» it stays on its first frame.
 */
function GifPlayer({ uri, kind }: { uri: string; kind: string }) {
  const still = useA11yPref('reduceMotion');
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    if (!still) p.play();
  });
  return (
    <VideoView
      testID="gif-player"
      accessibilityLabel={kind}
      player={player}
      nativeControls={false}
      contentFit="cover"
      surfaceType="textureView"
      style={StyleSheet.absoluteFill}
    />
  );
}

/**
 * A GIF bubble (owner 2026-11-01): one staff sent from GIPHY (or a video the webhook flags as
 * animated), signed as the bubble renders like a photo, in the video's fixed tile so the inverted
 * list never jumps. A long press opens the bubble's menu.
 */
export function GifBubble({ message: m, phone, kind, onLongPress }: GifBubbleProps) {
  const file = useQuery(threadFileQuery(phone, m.id));
  const uri = file.data?.url ?? null;
  const ended = file.error ? problemText(mediaProblem(file.error), kind) : null;
  if (ended) return <MediaNote text={ended} />;
  if (file.error) return <RetryLine onPress={() => void file.refetch()} />;
  return (
    <Pressable
      testID={`gif-${m.id}`}
      accessible={false}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={{
        ...VIDEO_TILE,
        maxWidth: '100%',
        overflow: 'hidden',
        borderRadius: shape.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'black',
      }}
    >
      {uri ? <GifPlayer uri={uri} kind={kind} /> : <Spinner color={palette.dark.ink} />}
    </Pressable>
  );
}
