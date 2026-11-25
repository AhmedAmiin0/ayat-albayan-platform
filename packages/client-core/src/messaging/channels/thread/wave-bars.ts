// A voice note's waveform in the student chat, web and phone alike.

/** Bars in a voice note's waveform, about WhatsApp's count at bubble width. */
export const WAVE_BARS = 28;

/**
 * NOT the real waveform (that needs the audio decoded): bar heights 0.25–1, seeded from
 * the message id (FNV-1a, then xorshift32), so a note looks the same on every render and run.
 */
export function waveBars(seed: string, count: number = WAVE_BARS): number[] {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    h >>>= 0;
    out.push(0.25 + ((h % 1000) / 1000) * 0.75);
  }
  return out;
}
