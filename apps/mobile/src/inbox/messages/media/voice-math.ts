import { mediaTime } from '../hooks/media-time';

/** Bars in a voice note's waveform, about WhatsApp's count at bubble width. */
export const BARS = 28;

/**
 * ponytail: NOT the real waveform (that needs the audio decoded, a native module): bar heights 0.25–1,
 * seeded from the message id (FNV-1a, then xorshift32), so a note looks the same on every render and run.
 */
export function waveBars(seed: string, count: number = BARS): number[] {
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

/** «1×» → «1.5×» → «2×» → «1×», as WhatsApp's speed chip. */
export const RATES = [1, 1.5, 2] as const;
export type Rate = (typeof RATES)[number];

export function nextRate(rate: Rate): Rate {
  return RATES[(RATES.indexOf(rate) + 1) % RATES.length] ?? 1;
}

export const rateLabel = (rate: Rate): string => `${rate}×`;

/** Where a touch `x` (from the left edge) falls, 0–1 from the reading start: in Arabic (RTL) the right edge. */
export function touchFraction(x: number, width: number, rtl: boolean): number {
  if (!(width > 0)) return 0;
  const f = Math.min(1, Math.max(0, x / width));
  return rtl ? 1 - f : f;
}

/** The screen reader's adjust: ±`delta` seconds, kept inside the note. */
export function stepTo(current: number, duration: number, delta: number): number {
  return Math.min(Math.max(0, duration), Math.max(0, current + delta));
}

/** What the player knows, as expo-audio's status reports it. */
export interface VoiceTime {
  playing: boolean;
  currentTime: number;
  duration: number;
  didJustFinish: boolean;
}

/** At the end: the next «تشغيل» starts over. */
export const atEnd = (s: VoiceTime): boolean => s.didJustFinish || (s.duration > 0 && s.currentTime >= s.duration);

/** The time beside the waveform: elapsed while playing or paused midway; else the length; empty until known. */
export function voiceClock(s: VoiceTime): string {
  if (!atEnd(s) && (s.playing || s.currentTime > 0)) return mediaTime(s.currentTime);
  return s.duration > 0 ? mediaTime(s.duration) : '';
}
