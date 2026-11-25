import { expect, test } from 'vitest';
import { WAVE_BARS, waveBars } from './wave-bars';

test('the waveform: 28 bars, 0.25–1, the same for the same message id on every call', () => {
  const bars = waveBars('b1111111-1111-4111-8111-111111111111');
  expect(bars).toHaveLength(WAVE_BARS);
  expect(bars.every((h) => h >= 0.25 && h <= 1)).toBe(true);
  expect(waveBars('b1111111-1111-4111-8111-111111111111')).toEqual(bars);
  expect(waveBars('another-id')).not.toEqual(bars);
  expect(new Set(bars.map((h) => h.toFixed(2))).size).toBeGreaterThan(5);
  expect(waveBars('x', 12)).toHaveLength(12);
});
