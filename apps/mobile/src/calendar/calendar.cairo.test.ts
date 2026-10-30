import type { ScheduleOverview } from '@ab/shared';
import { lesson } from '@/today/testing/fixtures';
import { agendaDays } from './agenda/agenda';
import { weekWindow, zonedMidnight } from './lib/week';
import { dayCounts, teacherAgendas, type TeacherFilter } from './overview/overview';
import { abrar } from './overview/overview-fixtures';
import { windowsLine } from './overview/overview-text';

// A Cairo viewer (UTC+2 since Fri 30 Oct 2026, UTC+3 before) over lessons the academy books on
// Riyadh's clock (UTC+3, no DST): the calendars cut and group by the VIEWER's days (review of
// #462), never by Riyadh's.
const CAIRO = 'Africa/Cairo';
const RIYADH = 'Asia/Riyadh';
const ALL: TeacherFilter = { program: 'all', gender: 'all' };
const SAT = '2026-10-31';
const at = (id: string, startsAt: string) => {
  const ends = new Date(Date.parse(startsAt) + 45 * 60_000).toISOString();
  return lesson({ id, starts_at: startsAt, ends_at: ends });
};
// Sunday 1 Nov 00:30 in Riyadh = Saturday 31 Oct 23:30 in Cairo.
const pastRiyadhMidnight = at('late', '2026-10-31T21:30:00.000Z');
// Saturday 31 Oct 00:30 in Riyadh = Friday 30 Oct 23:30 in Cairo: the week before, for Cairo.
const fridayInCairo = at('fri', '2026-10-30T21:30:00.000Z');

test('the viewer’s midnight follows Cairo’s DST, never a fixed +03:00', () => {
  expect(zonedMidnight('2026-10-03', CAIRO)).toBe('2026-10-02T21:00:00.000Z'); // summer
  expect(zonedMidnight('2026-10-30', CAIRO)).toBe('2026-10-29T22:00:00.000Z'); // change night
  expect(zonedMidnight(SAT, CAIRO)).toBe('2026-10-30T22:00:00.000Z');
  expect(zonedMidnight(SAT, RIYADH)).toBe('2026-10-30T21:00:00.000Z');
  const { from, to } = weekWindow('2026-10-24', CAIRO);
  // The week Cairo leaves summer time runs an hour longer.
  expect(Date.parse(to) - Date.parse(from)).toBe((7 * 24 + 1) * 3_600_000);
});

test('agenda: a lesson past Riyadh midnight sits under the Cairo viewer’s own day', () => {
  const cairo = agendaDays([pastRiyadhMidnight], SAT, CAIRO);
  expect(cairo[0]?.lessons.map((l) => l.id)).toEqual(['late']); // السبت, read 23:30
  const riyadh = agendaDays([pastRiyadhMidnight], SAT, RIYADH);
  expect(riyadh[1]?.lessons.map((l) => l.id)).toEqual(['late']); // الأحد, read 00:30
});

const overview: ScheduleOverview = {
  from: '2026-10-30T22:00:00.000Z',
  to: '2026-11-06T22:00:00.000Z',
  teachers: [
    {
      ...abrar,
      free: [],
      // The API's «always available» rows: two whole Riyadh days, cut at Riyadh midnight.
      windows: [
        { starts_at: '2026-10-30T21:00:00.000Z', ends_at: '2026-10-31T21:00:00.000Z' },
        { starts_at: '2026-10-31T21:00:00.000Z', ends_at: '2026-11-01T21:00:00.000Z' },
      ],
    },
  ],
  lessons: [fridayInCairo, pastRiyadhMidnight],
};

test('week view: clipped at the viewer’s Saturday midnight, the day head is the viewer’s day', () => {
  const [week] = teacherAgendas(overview, { start: SAT, tz: CAIRO, view: 'week', filter: ALL });
  expect(week?.items.map((i) => (i.kind === 'day' ? i.date : i.kind))).toEqual([SAT, 'lesson']);
  const counts = dayCounts(overview, { start: SAT, tz: CAIRO }, ALL).map((d) => d.count);
  expect(counts).toEqual([1, 0, 0, 0, 0, 0, 0]);
});

test('day view: an all-day window reads 00:00 – 24:00 on the viewer’s clock, not 23:00 – 23:00', () => {
  const [day] = teacherAgendas(overview, { start: SAT, tz: CAIRO, view: 'day', filter: ALL });
  expect(day?.windows).toEqual([
    { starts_at: '2026-10-30T22:00:00.000Z', ends_at: '2026-10-31T22:00:00.000Z' },
  ]);
  expect(windowsLine(day?.windows ?? [], '24', CAIRO)).toContain('00:00 – 24:00');
});
