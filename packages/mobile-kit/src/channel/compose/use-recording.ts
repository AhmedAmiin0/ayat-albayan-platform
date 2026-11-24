import { useState } from 'react';
import { useChannelMedia, type ChannelPickedFile } from '../media-port';
import { useElapsed } from './use-elapsed';

/** Without a recorder in this app, `available` is false. */
export function useRecording(onDone: (file: ChannelPickedFile) => void) {
  const recorder = useChannelMedia().recorder;
  const [on, setOn] = useState(false);
  const ms = useElapsed(on, recorder?.elapsedMs);
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
    ms,
    start: () => void start(),
    stop: () => void stop(),
    cancel,
  };
}
