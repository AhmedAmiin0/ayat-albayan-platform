import { ALL, dateError, filterParams, isDay, isFiltered, NO_FILTERS } from './activity-filters';

test('no filters sends no params', () => {
  expect(filterParams(NO_FILTERS)).toEqual({
    role: undefined,
    entity: undefined,
    from: undefined,
    to: undefined,
  });
  expect(isFiltered(NO_FILTERS)).toBe(false);
});

test('role, entity and valid days are sent; «الكل» is not', () => {
  const f = { role: 'teacher', entity: ALL, from: '2026-10-01', to: '2026-10-05' };
  expect(filterParams(f)).toMatchObject({
    role: 'teacher',
    entity: undefined,
    from: '2026-10-01',
    to: '2026-10-05',
  });
  expect(isFiltered(f)).toBe(true);
});

test('isDay: a real calendar day in Western or Arabic-Indic digits', () => {
  expect(isDay('2026-10-05')).toBe(true);
  expect(isDay('٢٠٢٦-١٠-٠٥')).toBe(true);
  expect(isDay('2026-02-30')).toBe(false);
  expect(isDay('2026-1-5')).toBe(false);
  expect(isDay('')).toBe(false);
});

test('a half-typed date is an error but never reaches the API', () => {
  const f = { ...NO_FILTERS, from: '2026-10' };
  expect(dateError(f)).toBe('dateInvalid');
  expect(filterParams(f).from).toBeUndefined();
});

test('start after end is an error; equal days and blanks are fine', () => {
  expect(dateError({ from: '2026-10-06', to: '2026-10-05' })).toBe('dateOrder');
  expect(dateError({ from: '2026-10-05', to: '2026-10-05' })).toBeNull();
  expect(dateError({ from: '', to: '2026-10-05' })).toBeNull();
  expect(filterParams({ ...NO_FILTERS, from: '2026-10-06', to: '2026-10-05' }).to).toBeUndefined();
});
