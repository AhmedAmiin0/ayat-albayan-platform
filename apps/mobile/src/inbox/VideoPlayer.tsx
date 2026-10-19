import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { shape } from '@/theme';

/**
 * A video inside the bubble (owner 2026-10-19 #1), with the system's own controls (play, seek,
 * full screen). It starts once loaded: the tap that fetched it was the «تشغيل». The URL is pinned on
 * mount, so a refetched signed URL never restarts playback.
 */
export function VideoPlayer({ url, kind }: { url: string; kind: string }) {
  const [source] = useState(url);
  const player = useVideoPlayer(source, (p) => p.play());
  return (
    <VideoView
      testID="video-player"
      accessibilityLabel={kind}
      player={player}
      nativeControls
      contentFit="contain"
      style={{ width: 240, height: 180, maxWidth: '100%', borderRadius: shape.radius.md }}
    />
  );
}
