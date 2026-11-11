import { boardWindow } from './board-window';

test('14 days back and 14 ahead from her local midnights (Cairo: summer time ends 29 Oct)', () => {
  expect(boardWindow(new Date('2026-11-11T12:00:00Z'), 'Africa/Cairo')).toEqual({
    from: '2026-10-27T21:00:00.000Z',
    to: '2026-11-24T22:00:00.000Z',
  });
});

test('late evening UTC is already tomorrow in Riyadh: the window follows her day', () => {
  expect(boardWindow(new Date('2026-11-11T22:30:00Z'), 'Asia/Riyadh')).toEqual({
    from: '2026-10-28T21:00:00.000Z',
    to: '2026-11-25T21:00:00.000Z',
  });
});

test('stable through the day: the same window at 00:01 and 23:59', () => {
  const tz = 'Asia/Riyadh';
  expect(boardWindow(new Date('2026-11-10T21:01:00Z'), tz)).toEqual(
    boardWindow(new Date('2026-11-11T20:59:00Z'), tz),
  );
});
