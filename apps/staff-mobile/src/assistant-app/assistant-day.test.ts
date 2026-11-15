import { assistantDay } from './assistant-day';

test('one Riyadh day as UTC instants, the next day as its end', () => {
  expect(assistantDay('2026-10-12')).toEqual({ from: '2026-10-11T21:00:00.000Z', to: '2026-10-12T21:00:00.000Z' });
});

test('a month end rolls over', () => {
  expect(assistantDay('2026-10-31').to).toBe('2026-10-31T21:00:00.000Z');
});
