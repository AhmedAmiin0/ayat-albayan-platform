import type { Session } from '@supabase/supabase-js';
import { renderHook } from '@testing-library/react-native';
import { t } from '../lib/i18n/i18n';
import { queryClient } from '../lib/query/query-client';
import { setLoginNotice, useLoginNotice } from './login-notice';
import { appRole, isOtherAppRole, roleClaim } from './role-claim';
import { verifyRole } from './verify-role';

// docs/50 §7: the family app's gate is the staff gate with the role sets swapped. Guardians and
// students enter; staff are signed out with the inverted «wrongApp» notice.

const mockApiFetch = jest.fn();
const mockSignOut = jest.fn();
jest.mock('./audience', () => ({ audience: () => 'family' }));
jest.mock('../lib/http/api', () => ({
  ...jest.requireActual('../lib/http/api'),
  call: ({ path }: { path: string }) => mockApiFetch(path),
}));
jest.mock('../lib/http/supabase', () => ({
  supabase: { auth: { signOut: () => mockSignOut() } },
}));

const claim = (role: string) => `h.${btoa(JSON.stringify({ sub: 'u1', user_role: role }))}.s`;
const session = (role: string) => ({ access_token: claim(role) }) as Session;
const shownNotice = async () => (await renderHook(useLoginNotice)).result.current;

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  setLoginNotice(null);
});

test.each([['guardian'], ['student']])('a %s enters the family app', async (role) => {
  mockApiFetch.mockResolvedValue({ role });
  expect(await verifyRole(session(role))).toBe(role);
  expect(mockSignOut).not.toHaveBeenCalled();
  expect(await shownNotice()).toBeNull();
});

test.each([['admin'], ['teacher'], ['sales'], ['assistant']])(
  'staff (%s) are signed out with the inverted «wrongApp»',
  async (role) => {
    mockApiFetch.mockResolvedValue({ role });
    expect(await verifyRole(session(role))).toBe('out');
    expect(mockSignOut).toHaveBeenCalled();
    expect(await shownNotice()).toBe(t.familyApp.wrongApp);
  },
);

test('the role sets and the offline claim follow the family app', () => {
  expect(appRole('guardian')).toBe('guardian');
  expect(appRole('admin')).toBeNull();
  expect(isOtherAppRole('teacher')).toBe(true);
  expect(isOtherAppRole('student')).toBe(false);
  expect(roleClaim(claim('student'))).toBe('student');
  expect(roleClaim(claim('admin'))).toBeNull();
});
