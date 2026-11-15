import { lesson } from '@/today/testing/fixtures';
import { groupOf, groupSessions } from './sessions';

// Lesson 16:00–16:45 Riyadh (13:00Z–13:45Z): opens 12:45Z, closes 15:45Z.
const at = (iso: string) => new Date(iso);
const row = lesson({ id: 'a' });

test('before the window it is upcoming, inside it now, after it ended', () => {
  expect(groupOf(row, at('2026-10-01T12:00:00Z'))).toBe('upcoming');
  expect(groupOf(row, at('2026-10-01T13:10:00Z'))).toBe('now');
  expect(groupOf(row, at('2026-10-01T16:00:00Z'))).toBe('ended');
});

test('cancelled lessons are dropped and each group is earliest first', () => {
  const late = lesson({ id: 'late', starts_at: '2026-10-01T17:00:00.000Z', ends_at: '2026-10-01T17:45:00.000Z' });
  const early = lesson({ id: 'early', starts_at: '2026-10-01T15:00:00.000Z', ends_at: '2026-10-01T15:45:00.000Z' });
  const gone = lesson({ id: 'gone', status: 'cancelled_by_admin' });
  const out = groupSessions([late, gone, early, row], at('2026-10-01T12:00:00Z'));
  expect(out.upcoming.map((l) => l.id)).toEqual(['a', 'early', 'late']);
  expect(out.now).toEqual([]);
  expect(out.ended).toEqual([]);
});

test('a custom join window moves the boundaries', () => {
  const win = { opensBeforeMin: 60, closesAfterMin: 0 };
  expect(groupOf(row, at('2026-10-01T12:30:00Z'), win)).toBe('now');
  expect(groupOf(row, at('2026-10-01T13:50:00Z'), win)).toBe('ended');
});
