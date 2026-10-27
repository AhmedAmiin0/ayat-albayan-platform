// A voice note's life in the composer (owner 2026-10-27, as WhatsApp), as a pure reducer:
// idle → arming → holding → (cancelled | locked | sending) → stopped → sending → idle | failed.

/** A release sooner than this is a tap: nothing is sent, the hint is shown. */
export const MIN_MS = 700;
/** A recording stops (and is kept) at 10 minutes: ~3.6 MB at 48 kbps, within the upload limit. */
export const MAX_MS = 10 * 60_000;

/** A finished recording, with the one clientRequestId every retry of it reuses (rule 8). */
export interface Take {
  uri: string;
  ms: number;
  id: string;
}

export type VoiceState =
  | { kind: 'idle' }
  /** Pressed: the permission, then the recorder is being prepared. */
  | { kind: 'arming' }
  /** Recording while the finger is down. */
  | { kind: 'holding' }
  /** Recording hands-free (slid up, or a screen reader's tap). */
  | { kind: 'locked' }
  /** Stopped and kept (the touch was taken, the app left, 10 minutes): delete or send. */
  | { kind: 'stopped'; take: Take }
  | { kind: 'sending'; take: Take }
  /** Not sent: kept for another try with the same id. */
  | { kind: 'failed'; take: Take };

export type VoiceEvent =
  | { type: 'arm' }
  /** No recording after all: no permission yet, the recorder could not start, or a discard. */
  | { type: 'reset' }
  | { type: 'recording'; locked: boolean }
  | { type: 'lock' }
  | { type: 'keep'; take: Take }
  | { type: 'send'; take: Take }
  | { type: 'sent' }
  | { type: 'fail' };

export const IDLE: VoiceState = { kind: 'idle' };

const live = (s: VoiceState): boolean => s.kind === 'holding' || s.kind === 'locked';

/** The next state; an event that does not apply leaves the state as it is. */
export function voiceReducer(s: VoiceState, e: VoiceEvent): VoiceState {
  switch (e.type) {
    case 'arm':
      return s.kind === 'idle' ? { kind: 'arming' } : s;
    case 'reset':
      return s.kind === 'sending' ? s : IDLE;
    case 'recording':
      return s.kind === 'arming' ? { kind: e.locked ? 'locked' : 'holding' } : s;
    case 'lock':
      return s.kind === 'holding' ? { kind: 'locked' } : s;
    case 'keep':
      return live(s) ? { kind: 'stopped', take: e.take } : s;
    case 'send':
      return live(s) || s.kind === 'stopped' || s.kind === 'failed' ? { kind: 'sending', take: e.take } : s;
    case 'sent':
      return s.kind === 'sending' ? IDLE : s;
    case 'fail':
      return s.kind === 'sending' ? { kind: 'failed', take: s.take } : s;
  }
}

/** The microphone is open. */
export const isRecording = live;

/** The kept recording a send or retry uses (its id included), or null. */
export const keptTake = (s: VoiceState): Take | null => (s.kind === 'stopped' || s.kind === 'failed' ? s.take : null);

/** What lifting the finger does: a hold under MIN_MS is a tap; a locked recording ignores it. */
export function onRelease(s: VoiceState, ms: number): 'too_short' | 'send' | 'none' {
  if (s.kind !== 'holding') return 'none';
  return ms < MIN_MS ? 'too_short' : 'send';
}

interface ModeInput {
  /** Voice notes are possible here: staff, open window, a recorder in this APK, no call. */
  voice: boolean;
  text: string;
  /** A saved reply's file waits in its chip. */
  staged: boolean;
  state: VoiceState;
}

/** The round button: the microphone while there is nothing else to send, else «أرسل». */
export function roundMode({ voice, text, staged, state }: ModeInput): 'mic' | 'send' {
  if (!voice || text.trim() !== '' || staged) return 'send';
  return state.kind === 'idle' || state.kind === 'arming' || state.kind === 'holding' ? 'mic' : 'send';
}

/** The meter's dB (about -60 quiet … 0 loud) as a bar height 0–1. */
export function meterLevel(db: number): number {
  if (!Number.isFinite(db)) return 0;
  return Math.min(1, Math.max(0, (db + 60) / 60));
}
