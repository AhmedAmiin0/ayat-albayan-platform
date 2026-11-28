import type { Session } from '@supabase/supabase-js';
import { pathKey } from '../lib/query/query-keys';
import { queryClient } from '../lib/query/query-client';
import { setLoginNotice } from './login-notice';
import { meSchema, verifyRole } from './verify-role';

const mockRead = jest.fn();
const mockSignOut = jest.fn();
jest.mock('../lib/http/api', () => ({
  ...jest.requireActual('../lib/http/api'),
  call: (request: unknown) => mockRead(request),
}));
jest.mock('../lib/http/supabase', () => ({ supabase: { auth: { signOut: () => mockSignOut() } } }));

const session = (role: string) => ({ access_token: `h.${btoa(JSON.stringify({ user_role: role }))}.s` }) as Session;

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  setLoginNotice(null);
});

test('an /auth/me answer without a usable role is no role: signed out', async () => {
  mockRead.mockResolvedValueOnce({}).mockResolvedValueOnce({ role: 7 });
  expect(await verifyRole(session('admin'))).toBe('out');
  expect(await verifyRole(session('admin'))).toBe('out');
  expect(mockSignOut).toHaveBeenCalledTimes(2);
});

test('a body that is text, a number or a list is no role: signed out', async () => {
  for (const body of ['<html>portal</html>', 5, ['admin']]) {
    mockRead.mockResolvedValueOnce(body);
    expect(await verifyRole(session('admin'))).toBe('out');
  }
  expect(mockSignOut).toHaveBeenCalledTimes(3);
});

test('an empty (null) body falls back to the token claim', async () => {
  mockRead.mockResolvedValue(null);
  expect(await verifyRole(session('teacher'))).toBe('teacher');
  expect(mockSignOut).not.toHaveBeenCalled();
});

test('the cached /auth/me keeps the fields the tab bar reads', async () => {
  mockRead.mockResolvedValue({ role: 'sales', permissions: ['leads.read'] });
  expect(await verifyRole(session('sales'))).toBe('sales');
  expect(queryClient.getQueryData(pathKey('/auth/me'))).toEqual({ role: 'sales', permissions: ['leads.read'] });
});

test('meSchema keeps unknown fields and turns an odd role into null', () => {
  expect(meSchema.parse({ role: 'admin', x: 1 })).toEqual({ role: 'admin', x: 1 });
  expect(meSchema.parse({ role: ['admin'] })).toEqual({ role: null });
});
