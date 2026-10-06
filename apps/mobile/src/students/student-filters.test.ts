import { activeCount, countOf, countParams, totalOf, listParams, NO_FILTERS, type StudentFilters } from './student-filters';

const set: StudentFilters = { ...NO_FILTERS, status: 'trial', teacher: 'none', package: 'low', tz: 'Africa/Cairo', sort: 'remaining' };

test('no filters: an empty request in the default order', () => {
  expect(Object.values(listParams(NO_FILTERS)).every((v) => v === undefined)).toBe(true);
  expect(activeCount(NO_FILTERS)).toBe(0);
});

test('list params carry every set filter and the sort', () => {
  expect(listParams(set)).toMatchObject({ status: 'trial', teacher: 'none', package: 'low', tz: 'Africa/Cairo', sort: 'remaining', dir: 'asc' });
  expect(listParams(set).program).toBeUndefined();
});

test('status counts ignore the status filter itself', () => {
  expect(countParams(set)).toMatchObject({ teacher: 'none', package: 'low' });
  expect('status' in countParams(set)).toBe(false);
});

test('active count excludes the sort', () => {
  expect(activeCount(set)).toBe(4);
  expect(activeCount({ ...NO_FILTERS, sort: 'name' })).toBe(0);
});

test('counts: numbers only, the total needs every status', () => {
  const counts = { trial: 2, active: 5, paused: 1, churned: 3 };
  expect(countOf(counts, 'active')).toBe(5);
  expect(totalOf(counts)).toBe(11);
  expect(totalOf({ ...counts, paused: undefined })).toBeUndefined();
  expect(countOf({ items: [] }, 'trial')).toBeUndefined();
  expect(totalOf(undefined)).toBeUndefined();
});
