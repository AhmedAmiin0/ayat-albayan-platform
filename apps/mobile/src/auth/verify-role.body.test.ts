import type { Session } from '@supabase/supabase-js';
import { pathKey } from '@/core/lib/query/query-keys';
import { queryClient } from '@/core/lib/query/query-client';
import { setLoginNotice } from './login-notice';
import { meSchema, verifyRole } from './verify-role';

const mockApiFetch = jest.fn();
const mockSignOut = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('@/core/lib/http/supabase', () => ({ supabase: { auth: { signOut: () => mockSignOut() } } }));

const session = (role: string) => ({ access_token: `h.${btoa(JSON.stringify({ user_role: role }))}.s` }) as Session;

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  setLoginNotice(null);
});

test('an /auth/me answer without a usable role is no role: signed out', async () => {
  mockApiFetch.mockResolvedValueOnce({}).mockResolvedValueOnce({ role: 7 });
  expect(await verifyRole(session('admin'))).toBe('out');
  expect(await verifyRole(session('admin'))).toBe('out');
  expect(mockSignOut).toHaveBeenCalledTimes(2);
});

test('an answer that is not an object at all falls back to the token claim', async () => {
  mockApiFetch.mockResolvedValue(null);
  expect(await verifyRole(session('teacher'))).toBe('teacher');
  expect(mockSignOut).not.toHaveBeenCalled();
});

test('the cached /auth/me keeps the fields the tab bar reads', async () => {
  mockApiFetch.mockResolvedValue({ role: 'sales', permissions: ['leads.read'] });
  expect(await verifyRole(session('sales'))).toBe('sales');
  expect(queryClient.getQueryData(pathKey('/auth/me'))).toEqual({ role: 'sales', permissions: ['leads.read'] });
});

test('meSchema keeps unknown fields and turns an odd role into null', () => {
  expect(meSchema.parse({ role: 'admin', x: 1 })).toEqual({ role: 'admin', x: 1 });
  expect(meSchema.parse({ role: ['admin'] })).toEqual({ role: null });
});
