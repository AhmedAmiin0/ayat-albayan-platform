import { digest, GOLDEN_TIMES, GOLDEN_ZONES, goldenDates, goldenInstants } from '@ab/shared/testing';
import { dateChoices, startsAtUtc, zonedClock } from './schedule-time';

// Regression golden (docs/34 §7): the meeting form's wall clock → the UTC instant sent to the API.
// Before the swap to the date-fns facade the old Intl / two-pass code ran beside the new one here
// over this sweep and agreed on every value; the digests were taken from the old code.

const dates = goldenDates();
const instants = goldenInstants();
const slotAt = (date: string, time: string) => ({
  date,
  hour: Number(time.slice(0, 2)),
  minute: Number(time.slice(3)),
});
const line = (c: { date: string; hour: number; minute: number }) => `${c.date} ${c.hour} ${c.minute}`;

const EXPECTED: Record<string, { wall: string; clock: string }> = {
  'Africa/Cairo': { wall: '5700:83595874', clock: '18240:131eb3bb' },
  'Asia/Riyadh': { wall: '5700:b6f52d53', clock: '18240:3400662d' },
  'Asia/Dubai': { wall: '5700:f1a17c07', clock: '18240:45346585' },
  'Asia/Kuwait': { wall: '5700:b6f52d53', clock: '18240:3400662d' },
  'Asia/Qatar': { wall: '5700:b6f52d53', clock: '18240:3400662d' },
  'Europe/London': { wall: '5700:580c4659', clock: '18240:f8766c25' },
  'America/New_York': { wall: '5700:5464dfbd', clock: '18240:6963d539' },
};

describe.each(GOLDEN_ZONES)('schedule-time, pinned, in %s', (zone) => {
  test('wall clock → UTC instant for every day and time of the sweep', () => {
    const lines = dates.flatMap((d) => GOLDEN_TIMES.map((t) => startsAtUtc(slotAt(d, t), zone)));
    expect(digest(lines)).toBe(EXPECTED[zone]?.wall);
  });

  test('the zoned clock and the first date chip, every half hour', () => {
    const lines = instants.map((at) => `${line(zonedClock(at, zone))} ${dateChoices(at, zone, 1).join()}`);
    expect(digest(lines)).toBe(EXPECTED[zone]?.clock);
  });
});

const EDGES = [
  ['2026-04-24 00:30', 'Africa/Cairo', '2026-04-23T22:30:00.000Z'], // spring-forward gap
  ['2026-10-29 23:30', 'Africa/Cairo', '2026-10-29T21:30:00.000Z'], // repeated (24:00 → 23:00)
  ['2026-10-30 00:00', 'Africa/Cairo', '2026-10-29T22:00:00.000Z'],
  ['2026-03-08 02:30', 'America/New_York', '2026-03-08T06:30:00.000Z'],
  ['2026-11-01 01:30', 'America/New_York', '2026-11-01T05:30:00.000Z'],
  ['2026-03-29 01:30', 'Europe/London', '2026-03-29T01:30:00.000Z'],
] as const;

test.each(EDGES)('DST edge: %s in %s → %s', (wall, zone, iso) => {
  expect(startsAtUtc(slotAt(wall.slice(0, 10), wall.slice(11)), zone)).toBe(iso);
});
