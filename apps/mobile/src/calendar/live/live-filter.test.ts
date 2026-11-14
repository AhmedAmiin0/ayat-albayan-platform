import { lesson } from '@/today/testing/fixtures';
import { livePhase } from './live-filter';

// 16:00-16:45 Riyadh = 13:00Z-13:45Z; the window opens 12:45Z.
const row = lesson({ id: 'a', status: 'confirmed' });
const at = (iso: string) => new Date(iso);

test('15 minutes before the start is «soon», one second earlier is nothing', () => {
  expect(livePhase(row, at('2026-10-01T12:44:59Z'))).toBeNull();
  expect(livePhase(row, at('2026-10-01T12:45:00Z'))).toBe('soon');
});

test('from the start to the end it is live; after the end it is not', () => {
  expect(livePhase(row, at('2026-10-01T13:00:00Z'))).toBe('live');
  expect(livePhase(row, at('2026-10-01T13:45:00Z'))).toBe('live');
  expect(livePhase(row, at('2026-10-01T13:45:01Z'))).toBeNull();
});

test('only scheduled / confirmed lessons count', () => {
  const now = at('2026-10-01T13:10:00Z');
  expect(livePhase(lesson({ id: 'b', status: 'scheduled' }), now)).toBe('live');
  for (const status of ['completed', 'cancelled_by_admin', 'no_show'] as const) {
    expect(livePhase(lesson({ id: 'c', status }), now)).toBeNull();
  }
});
