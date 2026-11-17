import { useState } from 'react';
import { useChannelMedia, type ChannelPickedFile } from '../media-port';

/**
 * A voice note through the app's recorder (ChatXVoice): a tap on the microphone records, «أرسل»
 * stops and sends it, ✕ drops it. No recorder in this app: `available` is false (no microphone).
 */
export function useRecording(onDone: (file: ChannelPickedFile) => void) {
  const recorder = useChannelMedia().recorder;
  const [on, setOn] = useState(false);
  const start = async () => {
    const started = (await recorder?.start().catch(() => false)) ?? false;
    setOn(started);
  };
  const stop = async () => {
    setOn(false);
    const file = (await recorder?.stop().catch(() => null)) ?? null;
    if (file) onDone(file);
  };
  const cancel = () => {
    setOn(false);
    recorder?.cancel();
  };
  return {
    available: recorder !== undefined,
    on,
    start: () => void start(),
    stop: () => void stop(),
    cancel,
  };
}
