import type { CamMicAnswer, MediaAnswer } from './room-types';

/** PermissionsAndroid's answer words (a string union in RN, kept local so this stays pure). */
type AndroidResult = 'granted' | 'denied' | 'never_ask_again' | undefined;

export const fromAndroid = (r: AndroidResult): MediaAnswer =>
  r === 'granted' ? 'granted' : r === 'never_ask_again' ? 'blocked' : 'denied';

/** RECORD_AUDIO and CAMERA from one requestMultiple / two checks. */
export function camMicFromAndroid(mic: AndroidResult, cam: AndroidResult): CamMicAnswer {
  return { mic: fromAndroid(mic), cam: fromAndroid(cam) };
}

/**
 * What joining should turn on: only what was allowed (and what the user left on in the preview).
 */
export function mediaWish(answer: CamMicAnswer, wanted: { mic: boolean; cam: boolean }) {
  return {
    mic: wanted.mic && answer.mic === 'granted',
    cam: wanted.cam && answer.cam === 'granted',
  };
}
