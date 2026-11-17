import { useEffect, useRef, useState } from 'react';
import { mediaProgress, mediaTime } from '../../chat-ui/voice/media-time';
import { useChannelMedia, type ChannelVoicePlayer, type ChannelVoiceStatus } from '../media-port';
import { openOutside } from './open-outside';

interface VoiceInput {
  url: string;
  /** The length the sender's app recorded; null when unknown. */
  durationMs: number | null;
}

/** The clock: the position once it has played, else the length. */
const clockMs = (s: ChannelVoiceStatus, total: number): number =>
  s.playing || s.positionMs > 0 ? s.positionMs : total;

/**
 * One voice note's playback through the app's player (the port), made on the first tap and
 * released with the bubble. No player in this app: the tap opens the note in the phone's own.
 */
export function useVoice({ url, durationMs }: VoiceInput) {
  const port = useChannelMedia();
  const [status, setStatus] = useState<ChannelVoiceStatus>({
    playing: false,
    positionMs: 0,
    durationMs: durationMs ?? 0,
  });
  const player = useRef<ChannelVoicePlayer | null>(null);
  useEffect(() => () => player.current?.release(), []);
  const make = () => port.playVoice?.({ url, onStatus: setStatus }) ?? null;
  const ensure = (): ChannelVoicePlayer | null => {
    player.current ??= make();
    return player.current;
  };
  const toggle = () => {
    const p = ensure();
    if (p) {
      p.toggle();
      return;
    }
    openOutside(url);
  };
  const total = status.durationMs || (durationMs ?? 0);
  return {
    playing: status.playing,
    progress: mediaProgress(status.positionMs, total),
    clock: mediaTime(clockMs(status, total) / 1000),
    toggle,
    seek: (fraction: number) => ensure()?.seek(fraction),
  };
}
