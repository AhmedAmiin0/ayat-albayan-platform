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

const freeStream = (stream: MediaStream): void =>
  stream.getTracks().forEach((track) => track.stop());
const release = (take: Take): void => freeStream(take.stream);

/** The take in progress, handed over once: the box is empty after. */
function handOver(box: RefObject<Take | null>): Take | null {
  const current = box.current;
  box.current = null;
  return current;
}

/** Stops a take (if any): the recorder stops, the microphone is freed. */
function stopTake(current: Take | null): void {
  current?.recorder.stop();
  if (current) release(current);
}

/** Drops the take in progress. */
const dropTake = (box: RefObject<Take | null>): void => stopTake(handOver(box));

/** Opens the microphone and starts recording; a failure once the stream is open frees it. */
async function openTake(): Promise<Take> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  try {
    const mimeType = typeOf();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const current: Take = { recorder, stream, chunks: [], started: Date.now() };
    recorder.ondataavailable = (e) => current.chunks.push(e.data);
    recorder.start();
    return current;
  } catch (error) {
    freeStream(stream);
    throw error;
  }
}

interface Boxes {
  take: RefObject<Take | null>;
  /** A start waits on the browser's permission prompt: a second tap does nothing. */
  busy: RefObject<boolean>;
  /** The chat is still on screen (a take that opens after leaving is dropped at once). */
  alive: RefObject<boolean>;
}

const idle = (boxes: Boxes): boolean => !boxes.busy.current && boxes.take.current === null;

/** One start at a time; the answer lands only while the chat is still on screen. */
async function begin(boxes: Boxes, done: (state: RecorderState) => void): Promise<void> {
  if (!idle(boxes)) return;
  boxes.busy.current = true;
  const opened = await openTake().catch(() => null);
  boxes.busy.current = false;
  if (!boxes.alive.current) {
    stopTake(opened);
    return;
  }
  boxes.take.current = opened;
  done(opened ? 'recording' : 'denied');
}

export type RecorderState = 'idle' | 'recording' | 'denied';

/**
 * The composer's microphone: `start` asks for it (a refusal is «denied», said under the bar),
 * `stop` resolves the note (null when nothing was recorded), `cancel` drops it; the elapsed
 * seconds tick while recording. Leaving the chat mid-recording (or while the browser still asks)
 * drops the note and frees the mic.
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [seconds, setSeconds] = useState(0);
  const take = useRef<Take | null>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      dropTake(take);
    };
  }, []);
  useEffect(() => {
    if (state !== 'recording') return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [state]);
  const start = () =>
    begin({ take, busy, alive }, (next) => {
      setSeconds(0);
      setState(next);
    });
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
