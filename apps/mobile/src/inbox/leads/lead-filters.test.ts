import { activeFilterCount, leadListParams } from './lead-filters';

test('params are the web names; all-status and blanks are left out', () => {
  expect(leadListParams({ q: 'هدى', status: 'all', filters: {} })).toEqual({
    q: 'هدى', status: undefined, source: undefined, assignee: undefined, sort: undefined, dir: undefined,
  });
});

test('every filter travels with its value', () => {
  const params = leadListParams({
    q: '',
    status: 'new',
    filters: { source: 'facebook_ad', assignee: 'none', sort: 'created_at', dir: 'desc' },
  });
  expect(params).toMatchObject({ status: 'new', source: 'facebook_ad', assignee: 'none', sort: 'created_at', dir: 'desc' });
});

test('a direction without a sort key is never sent', () => {
  expect(leadListParams({ q: '', status: 'all', filters: { dir: 'desc' } }).dir).toBeUndefined();
});

test('the badge counts source, assignee and order', () => {
  expect(activeFilterCount({})).toBe(0);
  expect(activeFilterCount({ source: 'facebook_ad', sort: 'name' })).toBe(2);
  expect(activeFilterCount({ source: 'facebook_ad', assignee: 'x', sort: 'name' })).toBe(3);
});
