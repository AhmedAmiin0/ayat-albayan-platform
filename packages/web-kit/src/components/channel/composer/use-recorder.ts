import type { ChannelFileToSend } from '@ab/client-core';
import { useEffect, useRef, useState, type RefObject } from 'react';

// A voice note from the browser's microphone (MediaRecorder): the types the chat takes, in the
// order browsers make them (Chrome and Firefox webm/ogg Opus, Safari mp4 AAC).
const TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4'] as const;
const EXT: Readonly<Record<string, string>> = { 'audio/webm': 'webm', 'audio/ogg': 'ogg' };

/** Can this browser record at all (a microphone API and MediaRecorder)? */
export const canRecord = (): boolean =>
  typeof MediaRecorder === 'function' && Boolean((navigator as Partial<Navigator>).mediaDevices);

const typeOf = (): string | undefined => TYPES.find((m) => MediaRecorder.isTypeSupported(m));

interface Take {
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  started: number;
}

/** The recorded note as the chat sends it: its base type (no codecs part), name and length. */
function noteOf(take: Take): ChannelFileToSend {
  const mime = (take.recorder.mimeType || 'audio/webm').split(';')[0] ?? 'audio/webm';
  const blob = new Blob(take.chunks, { type: mime });
  const name = `voice.${EXT[mime] ?? 'm4a'}`;
  return { mime, name, size: blob.size, bytes: blob, durationMs: Date.now() - take.started };
}

const release = (take: Take): void => take.stream.getTracks().forEach((track) => track.stop());

/** The take in progress, handed over once: the box is empty after. */
function handOver(box: RefObject<Take | null>): Take | null {
  const current = box.current;
  box.current = null;
  return current;
}

/** Drops the take in progress: the recorder stops, the microphone is freed. */
function dropTake(box: RefObject<Take | null>): void {
  const current = handOver(box);
  current?.recorder.stop();
  if (current) release(current);
}

export type RecorderState = 'idle' | 'recording' | 'denied';

/**
 * The composer's microphone: `start` asks for it (a refusal is «denied», said under the bar),
 * `stop` resolves the note (null when nothing was recorded), `cancel` drops it; the elapsed
 * seconds tick while recording. Leaving the chat mid-recording drops the note and frees the mic.
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [seconds, setSeconds] = useState(0);
  const take = useRef<Take | null>(null);
  useEffect(() => () => dropTake(take), []);
  useEffect(() => {
    if (state !== 'recording') return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [state]);
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = typeOf();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const current: Take = { recorder, stream, chunks: [], started: Date.now() };
      recorder.ondataavailable = (e) => current.chunks.push(e.data);
      recorder.start();
      take.current = current;
      setSeconds(0);
      setState('recording');
    } catch {
      setState('denied');
    }
  };
  const stop = () =>
    new Promise<ChannelFileToSend | null>((resolve) => {
      const current = handOver(take);
      setState('idle');
      if (!current) {
        resolve(null);
        return;
      }
      current.recorder.onstop = () => {
        release(current);
        resolve(current.chunks.length > 0 ? noteOf(current) : null);
      };
      current.recorder.stop();
    });
  const cancel = () => {
    dropTake(take);
    setState('idle');
  };
  return { state, seconds, start, stop, cancel };
}
