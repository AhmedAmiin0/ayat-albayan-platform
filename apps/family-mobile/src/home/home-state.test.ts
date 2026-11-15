import type { PortalHome } from '@ab/shared';
import { homeState } from './home-state';

const child = {
  id: 's1',
  code: 'AB-0001',
  name: 'سارة',
  tz: 'Asia/Riyadh',
  contact_is_self: false,
};
const me = (students: PortalHome['students']): PortalHome => ({
  kind: 'guardian',
  students,
  renew_url: null,
});

test('loading, error, empty and list from /portal/me', () => {
  expect(homeState({ data: undefined, isError: false })).toBe('loading');
  expect(homeState({ data: undefined, isError: true })).toBe('error');
  expect(homeState({ data: me([]), isError: false })).toBe('empty');
  // Cached cards stay on screen when a refetch fails (offline).
  expect(homeState({ data: me([child]), isError: true })).toBe('list');
});
