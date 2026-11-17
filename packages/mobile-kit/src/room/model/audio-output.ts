// The call audio's outputs (LiveKit's AudioSession on Android). LiveKit picks one itself when the
// room starts (bluetooth, then a wired headset, then the loudspeaker): the room never forces the
// loudspeaker over a headset. The speaker button then steps through what the phone has. Pure.

export type AudioOutput = 'speaker' | 'earpiece' | 'headset' | 'bluetooth';

const OUTPUTS: readonly AudioOutput[] = ['speaker', 'earpiece', 'headset', 'bluetooth'];

/** LiveKit's default preference (its preferredOutputList). */
const AUTO_ORDER: readonly AudioOutput[] = ['bluetooth', 'headset', 'speaker', 'earpiece'];

/** The outputs among the SDK's ids, in the button's order; unknown ids are dropped. */
export const knownOutputs = (ids: readonly string[]): AudioOutput[] =>
  OUTPUTS.filter((o) => ids.includes(o));

/** What LiveKit routes to on its own among these; null when the phone lists none. */
export const autoOutput = (available: readonly AudioOutput[]): AudioOutput | null =>
  AUTO_ORDER.find((o) => available.includes(o)) ?? null;

/** The output after `current` (wrapping round); the first one when `current` is gone or unknown. */
export function nextOutput(
  current: AudioOutput | null,
  available: readonly AudioOutput[],
): AudioOutput | null {
  const list = OUTPUTS.filter((o) => available.includes(o));
  const at = current === null ? -1 : list.indexOf(current);
  return list[(at + 1) % list.length] ?? null;
}
