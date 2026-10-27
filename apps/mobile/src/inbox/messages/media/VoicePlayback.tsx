import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { mediaProgress, mediaTime } from '../hooks/media-time';
import { claimPlayback, releasePlayback } from './playback';
import { atEnd, nextRate, type Rate, stepTo, voiceClock } from './voice-math';
import { VoiceRow } from './VoiceRow';

interface VoicePlaybackProps {
  id: string;
  url: string;
  kind: string;
}

/**
 * A fetched voice note (expo-audio 57): it plays as soon as it is LOADED (the tap that fetched it was
 * the «تشغيل»), pausing any other note (playback.ts). The URL is pinned on mount, so a refetched signed
 * URL never restarts it; the player is released on unmount (useAudioPlayer).
 */
export function VoicePlayback({ id, url, kind }: VoicePlaybackProps) {
  const [source] = useState(url);
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);
  const [rate, setRate] = useState<Rate>(1);
  const autoplayed = useRef(false);

  const start = useCallback(() => {
    claimPlayback(id, () => player.pause());
    player.play();
  }, [id, player]);
  useEffect(() => {
    if (!status.isLoaded || autoplayed.current) return;
    autoplayed.current = true;
    start();
  }, [status.isLoaded, start]);
  useEffect(() => () => releasePlayback(id), [id]);

  const loaded = status.isLoaded && status.duration > 0;
  const seekTo = (seconds: number) => {
    if (loaded) void player.seekTo(seconds);
  };
  const toggle = () => {
    if (status.playing) return player.pause();
    // At the end: from the start again, as WhatsApp.
    if (atEnd(status)) seekTo(0);
    start();
  };
  const cycle = () => {
    const next = nextRate(rate);
    setRate(next);
    player.setPlaybackRate(next);
  };
  return (
    <VoiceRow
      id={id}
      kind={kind}
      playing={status.playing}
      busy={!status.isLoaded || status.isBuffering}
      progress={mediaProgress(status.currentTime, status.duration)}
      clock={voiceClock(status)}
      onToggle={toggle}
      onSeek={(f) => seekTo(f * status.duration)}
      seek={
        loaded
          ? {
              now: status.currentTime,
              max: status.duration,
              text: `${mediaTime(status.currentTime)} / ${mediaTime(status.duration)}`,
              onStep: (delta) => seekTo(stepTo(status.currentTime, status.duration, delta)),
            }
          : undefined
      }
      speed={status.playing || status.currentTime > 0 ? { rate, onPress: cycle } : undefined}
    />
  );
}
