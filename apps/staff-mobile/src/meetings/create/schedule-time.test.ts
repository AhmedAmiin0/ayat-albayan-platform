import { dateChoices, defaultSlot, slotOf, startsAtUtc, zonedClock } from './schedule-time';

test('a wall clock in the viewer zone becomes its UTC instant', () => {
  expect(startsAtUtc({ date: '2026-10-20', hour: 17, minute: 0 }, 'Asia/Riyadh')).toBe('2026-10-20T14:00:00.000Z');
  expect(startsAtUtc({ date: '2026-10-20', hour: 9, minute: 45 }, 'UTC')).toBe('2026-10-20T09:45:00.000Z');
  expect(startsAtUtc({ date: '2026-12-01', hour: 0, minute: 30 }, 'Asia/Dubai')).toBe('2026-11-30T20:30:00.000Z');
});

test('Cairo summer and winter time both land on the right instant (DST)', () => {
  expect(startsAtUtc({ date: '2026-10-20', hour: 17, minute: 0 }, 'Africa/Cairo')).toBe('2026-10-20T14:00:00.000Z');
  expect(startsAtUtc({ date: '2026-11-10', hour: 17, minute: 0 }, 'Africa/Cairo')).toBe('2026-11-10T15:00:00.000Z');
});

test('zonedClock reads the local day, hour and minute', () => {
  expect(zonedClock(new Date('2026-10-12T22:10:00Z'), 'Asia/Riyadh')).toEqual({ date: '2026-10-13', hour: 1, minute: 10 });
  expect(zonedClock(new Date('2026-10-12T22:10:00Z'), 'UTC')).toEqual({ date: '2026-10-12', hour: 22, minute: 10 });
});

test('a fresh form is the next quarter hour, at least 15 minutes ahead, one hour long', () => {
  expect(defaultSlot(new Date('2026-10-12T10:07:00Z'), 'Asia/Riyadh')).toEqual({ date: '2026-10-12', hour: 13, minute: 30, durationMin: 60 });
  expect(defaultSlot(new Date('2026-10-12T20:50:00Z'), 'Asia/Riyadh')).toEqual({ date: '2026-10-13', hour: 0, minute: 15, durationMin: 60 });
});

test('a meeting back as a form (reschedule): its local time and length, held in 15..240', () => {
  expect(slotOf('2026-10-20T14:00:00.000Z', '2026-10-20T15:30:00.000Z', 'Asia/Riyadh')).toEqual({
    date: '2026-10-20',
    hour: 17,
    minute: 0,
    durationMin: 90,
  });
  expect(slotOf('2026-10-20T14:00:00.000Z', null, 'UTC').durationMin).toBe(60);
  expect(slotOf('2026-10-20T14:00:00.000Z', '2026-10-21T14:00:00.000Z', 'UTC').durationMin).toBe(240);
});

test('14 date chips: today on the viewer calendar and the next 13 days', () => {
  const days = dateChoices(new Date('2026-10-12T22:30:00Z'), 'Asia/Riyadh');
  expect(days).toHaveLength(14);
  expect(days[0]).toBe('2026-10-13');
  expect(days[13]).toBe('2026-10-26');
  expect(dateChoices(new Date('2026-10-12T22:30:00Z'), 'UTC')[0]).toBe('2026-10-12');
});
