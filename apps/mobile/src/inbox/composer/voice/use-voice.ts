import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { requestId } from '@/core/lib/http/request-id';
import { fileError } from '../send-file';
import { useSendVoice } from './send-voice';
import { useVoiceRecorder } from './use-voice-recorder';
import { IDLE, isRecording, keptTake, onRelease, type Take, type VoiceEvent, voiceReducer } from './voice-machine';

/** The line under the bar: the tap hint, or the microphone blocked in Settings. */
export type VoiceNote = 'hint' | 'blocked' | null;

const say = (text: string) => AccessibilityInfo.announceForAccessibility(text);

interface VoiceInput {
  phone: string;
  /** Why the voice note did not go (inbox.error.<code>), or null when a new one starts. */
  onError: (message: string | null) => void;
  /** Another send of this chat is in flight: one at a time. */
  busy: boolean;
}

/**
 * One chat's voice note (owner 2026-10-27): the state machine, the recorder and the send. The state
 * is also kept in a ref so a gesture's events see each transition at once (no double stop or send).
 */
export function useVoice({ phone, onError, busy }: VoiceInput) {
  const now = useRef(IDLE);
  const [state, setState] = useState(IDLE);
  const [note, setNote] = useState<VoiceNote>(null);
  const go = (e: VoiceEvent) => {
    now.current = voiceReducer(now.current, e);
    setState(now.current);
  };
  const down = useRef(false);
  const startedAt = useRef(0);
  const [drag] = useState(() => new Animated.Value(0));
  const [hint] = useState(() => new Animated.Value(1));
  const sender = useSendVoice(phone);

  // A voice note started playing meanwhile: the recording is kept (keep, below).
  const interrupted = useRef<() => void>(() => undefined);
  const rec = useVoiceRecorder(() => interrupted.current());

  /** Stop and keep (the touch was taken, the app left, 10 minutes, a call, a note played). */
  const keep = async () => {
    if (!isRecording(now.current)) return;
    const done = await rec.stop();
    go(done ? { type: 'keep', take: { ...done, id: requestId() } } : { type: 'reset' });
  };
  useEffect(() => {
    interrupted.current = () => void keep();
  });

  const send = async (take: Take) => {
    if (now.current.kind === 'sending') return;
    // Another send of this chat is on its way: the recording waits in the bar (never lost, never twice).
    if (busy) return go({ type: 'keep', take });
    go({ type: 'send', take });
    onError(null);
    try {
      await sender.sendTake(take);
      go({ type: 'sent' });
      say(t.inbox.composer.voice.sent);
    } catch (e) {
      go({ type: 'fail' });
      onError(fileError(e));
      say(t.inbox.composer.voice.failed);
    }
  };

  /** Stop and discard; `spoken` says it aloud (a slide to cancel, the bin). */
  const discard = async (spoken: boolean) => {
    if (now.current.kind === 'sending') return;
    await rec.stop();
    go({ type: 'reset' });
    if (spoken) say(t.inbox.composer.voice.cancelled);
  };

  /** The press (locked = a screen reader's tap): permission, then record. */
  const press = async (locked: boolean) => {
    if (now.current.kind !== 'idle' || busy) return;
    down.current = !locked;
    setNote(null);
    go({ type: 'arm' });
    const result = await rec.start();
    if (result !== 'recording') {
      go({ type: 'reset' });
      if (result === 'blocked') setNote('blocked');
      return;
    }
    // Lifted while the recorder was getting ready: a tap, not a recording.
    if (!locked && !down.current) {
      await rec.stop();
      go({ type: 'reset' });
      setNote('hint');
      return;
    }
    startedAt.current = Date.now();
    go({ type: 'recording', locked });
    say(t.inbox.composer.voice.started);
  };

  const release = async () => {
    down.current = false;
    drag.setValue(0);
    hint.setValue(1);
    const action = onRelease(now.current, Date.now() - startedAt.current);
    if (action === 'too_short') {
      await discard(false);
      setNote('hint');
    }
    if (action !== 'send') return;
    const done = await rec.stop();
    if (done) await send({ ...done, id: requestId() });
    else go({ type: 'reset' });
  };

  /** «أرسل» in the bar: a locked recording stops first; a kept or failed one goes again (same id). */
  const finish = async () => {
    const kept = keptTake(now.current);
    if (kept) return send(kept);
    if (now.current.kind !== 'locked') return;
    const done = await rec.stop();
    if (done) await send({ ...done, id: requestId() });
    else go({ type: 'reset' });
  };

  return {
    state,
    note,
    ms: rec.ms,
    level: rec.level,
    drag,
    hint,
    press,
    release,
    keep,
    finish,
    cancel: () => discard(true),
    lock: () => go({ type: 'lock' }),
    /** A move's verdict may only cancel a live recording once. */
    recording: () => isRecording(now.current),
  };
}

export type VoiceUi = ReturnType<typeof useVoice>;
