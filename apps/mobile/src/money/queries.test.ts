import { periodTotals } from './queries';

test('totals come off the first page, ignoring anything malformed', () => {
  const sar = { currency: 'SAR', net: 100, payments: 120, refunds: 20 };
  expect(periodTotals({ items: [], totals: [sar, { nope: 1 }] })).toEqual([sar]);
  expect(periodTotals({ items: [] })).toEqual([]);
  expect(periodTotals(undefined)).toEqual([]);
  expect(periodTotals({ totals: 'x' })).toEqual([]);
});
