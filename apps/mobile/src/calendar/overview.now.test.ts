import { teacherAgendas, type TeacherFilter } from './overview';
import { OVERVIEW } from './overview-fixtures';

const ALL: TeacherFilter = { program: 'all', gender: 'all' };
const THU = '2026-10-01';
const free = (now: Date | undefined) =>
  teacherAgendas(OVERVIEW, { start: THU, view: 'day', filter: ALL, now })
    .flatMap((a) => a.items)
    .flatMap((i) => (i.kind === 'free' ? [`${i.span.starts_at}..${i.span.ends_at}`] : []));

test('free gaps already past are not offered: clipped to now (rounded up to a quarter hour)', () => {
  expect(free(undefined)[0]).toBe('2026-10-01T07:45:00.000Z..2026-10-01T13:00:00.000Z');
  // 08:07Z -> 08:15Z; Abrar's gap starts at 08:15 and ends 13:00.
  expect(free(new Date('2026-10-01T08:07:00Z'))[0]).toBe('2026-10-01T08:15:00.000Z..2026-10-01T13:00:00.000Z');
});

test('a remainder under 30 minutes is dropped, a gap that is over entirely is gone', () => {
  expect(free(new Date('2026-10-01T12:40:00Z'))).toEqual(['2026-10-01T17:00:00.000Z..2026-10-01T21:00:00.000Z']);
  expect(free(new Date('2026-10-01T13:30:00Z'))).toEqual(['2026-10-01T17:00:00.000Z..2026-10-01T21:00:00.000Z']);
});
