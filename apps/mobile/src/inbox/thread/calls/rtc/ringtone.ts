import { Vibration } from 'react-native';

/** A calm ring: a long pulse, a pause, repeated (no sound file: an asset would be a native change). */
export const RING_PATTERN = [0, 700, 1300];

export interface Ringtone {
  stop(): void;
}

/** Rings (vibrates) until stopped; the incoming screen shows the call at the same time. */
export function startRingtone(vibration: Pick<typeof Vibration, 'vibrate' | 'cancel'> = Vibration): Ringtone {
  vibration.vibrate(RING_PATTERN, true);
  return { stop: () => vibration.cancel() };
}
