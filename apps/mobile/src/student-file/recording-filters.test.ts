import { isFiltered, utcToday, NO_FILTERS, presetRange, recordingParams } from './recording-filters';

test('presets map to inclusive day ranges', () => {
  expect(presetRange('all', '2026-10-06')).toEqual({});
  expect(presetRange('last7', '2026-10-06')).toEqual({ from: '2026-09-30', to: '2026-10-06' });
  expect(presetRange('last30', '2026-10-06')).toEqual({ from: '2026-09-07', to: '2026-10-06' });
  expect(presetRange('month', '2026-02-10')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
});

test('params carry only what is set', () => {
  expect(recordingParams(NO_FILTERS, '2026-10-06')).toEqual({ teacherId: undefined });
  expect(recordingParams({ preset: 'last7', teacherId: 't1' }, '2026-10-06')).toEqual({
    from: '2026-09-30',
    to: '2026-10-06',
    teacherId: 't1',
  });
});

test('isFiltered', () => {
  expect(isFiltered(NO_FILTERS)).toBe(false);
  expect(isFiltered({ preset: 'all', teacherId: 't1' })).toBe(true);
});

test('today is the UTC date and follows the clock (Riyadh is already tomorrow after 21:00 UTC)', () => {
  expect(utcToday(new Date('2026-10-06T22:30:00Z'))).toBe('2026-10-06');
  expect(utcToday(new Date('2026-10-07T00:00:00Z'))).toBe('2026-10-07');
});
