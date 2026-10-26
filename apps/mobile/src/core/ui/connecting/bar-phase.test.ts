import { stripHeight } from './BarStrip';
import { BAR_DELAY_MS, connectingPhase, HINT_AFTER_MS, onlinePhase } from './bar-phase';

test('nothing for the first 800 ms, then «جارٍ الاتصال…», the hint from 10 s', () => {
  expect(connectingPhase(0)).toBe('hidden');
  expect(connectingPhase(BAR_DELAY_MS - 1)).toBe('hidden');
  expect(connectingPhase(BAR_DELAY_MS)).toBe('connecting');
  expect(connectingPhase(HINT_AFTER_MS - 1)).toBe('connecting');
  expect(connectingPhase(HINT_AFTER_MS)).toBe('check');
});

test('back online: «تم الاتصال» only after a bar that showed', () => {
  expect(onlinePhase('hidden')).toBe('hidden');
  expect(onlinePhase('connecting')).toBe('connected');
  expect(onlinePhase('check')).toBe('connected');
});

test('the strip fits its words at the largest text it allows (one line, two with the hint)', () => {
  expect(stripHeight('connecting')).toBeGreaterThanOrEqual(32);
  expect(stripHeight('check')).toBeGreaterThan(stripHeight('connecting'));
});
