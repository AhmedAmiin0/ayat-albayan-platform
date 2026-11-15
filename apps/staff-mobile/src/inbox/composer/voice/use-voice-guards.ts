import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { MAX_MS } from './voice-machine';

interface Guarded {
  ms: number;
  /** Stop and keep the recording (a no-op when none is live). */
  keep: () => Promise<void>;
}

/**
 * When a recording must stop but never be lost (owner 2026-10-27, as WhatsApp keeps a draft): the
 * app leaves the foreground (no background microphone), 10 minutes are reached, or a call starts
 * (the call needs the microphone). It is then kept in the bar: delete or send.
 */
export function useVoiceGuards(voice: Guarded, inCall: boolean): void {
  const keep = useRef(voice.keep);
  useEffect(() => {
    keep.current = voice.keep;
  });
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') void keep.current();
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (voice.ms >= MAX_MS) void keep.current();
  }, [voice.ms]);
  useEffect(() => {
    if (inCall) void keep.current();
  }, [inCall]);
}
