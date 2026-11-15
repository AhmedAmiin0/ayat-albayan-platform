import { atEnd, BARS, nextRate, rateLabel, stepTo, touchFraction, voiceClock, waveBars } from './voice-math';

const time = (over: Partial<Parameters<typeof voiceClock>[0]> = {}) => ({ playing: false, currentTime: 0, duration: 65, didJustFinish: false, ...over });

test('the waveform: 28 bars, 0.25–1, the same for the same message id on every call', () => {
  const bars = waveBars('b1111111-1111-4111-8111-111111111111');
  expect(bars).toHaveLength(BARS);
  expect(bars.every((h) => h >= 0.25 && h <= 1)).toBe(true);
  expect(waveBars('b1111111-1111-4111-8111-111111111111')).toEqual(bars);
  expect(waveBars('another-id')).not.toEqual(bars);
  expect(new Set(bars.map((h) => h.toFixed(2))).size).toBeGreaterThan(5);
});

test('the speed chip cycles 1× → 1.5× → 2× → 1×', () => {
  expect([nextRate(1), nextRate(1.5), nextRate(2)]).toEqual([1.5, 2, 1]);
  expect([rateLabel(1), rateLabel(1.5), rateLabel(2)]).toEqual(['1×', '1.5×', '2×']);
});

test('a touch on the waveform counts from the reading start: the right edge in Arabic', () => {
  expect(touchFraction(50, 200, false)).toBe(0.25);
  expect(touchFraction(50, 200, true)).toBe(0.75);
  expect([touchFraction(-5, 200, false), touchFraction(500, 200, false), touchFraction(10, 0, false)]).toEqual([0, 1, 0]);
});

test('the screen reader\'s ±5 s stays inside the note', () => {
  expect([stepTo(10, 65, 5), stepTo(2, 65, -5), stepTo(63, 65, 5)]).toEqual([15, 0, 65]);
});

test('the time: the length when not playing, the position while playing or paused midway, empty until known', () => {
  expect(voiceClock(time())).toBe('1:05');
  expect(voiceClock(time({ playing: true, currentTime: 13 }))).toBe('0:13');
  expect(voiceClock(time({ currentTime: 20 }))).toBe('0:20');
  expect(voiceClock(time({ currentTime: 65, didJustFinish: true }))).toBe('1:05');
  expect(voiceClock(time({ duration: 0 }))).toBe('');
});

test('at the end once it finished or reached its length', () => {
  expect([atEnd(time({ didJustFinish: true })), atEnd(time({ currentTime: 65 })), atEnd(time({ currentTime: 10 }))]).toEqual([true, true, false]);
});
