import { weekRange } from './dashboard-queries';

test('the Riyadh week runs Saturday to Friday', () => {
  // Monday 5 Oct 2026 → Saturday 3 Oct to Friday 9 Oct.
  expect(weekRange(new Date('2026-10-05T09:00:00Z'))).toEqual({
    from: '2026-10-03',
    to: '2026-10-09',
  });
});

test('after midnight in Riyadh the next day counts, and Saturday starts a new week', () => {
  // Friday 9 Oct 22:00Z is already Saturday 10 Oct 01:00 in Riyadh.
  expect(weekRange(new Date('2026-10-09T22:00:00Z'))).toEqual({
    from: '2026-10-10',
    to: '2026-10-16',
  });
});
