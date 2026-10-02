import type { Session } from '@supabase/supabase-js';
import { ApiError } from '@/lib/api';
import { verifyRole } from './verify-role';

const mockApiFetch = jest.fn();
const mockSignOut = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: () => mockSignOut() } } }));

const claim = (role: string | null) => `h.${btoa(JSON.stringify({ sub: 'u1', user_role: role }))}.s`;
const session = (role: string | null) => ({ access_token: claim(role) }) as Session;

beforeEach(() => jest.clearAllMocks());

test.each([['admin'], ['teacher']])('%s stays in', async (role) => {
  mockApiFetch.mockResolvedValue({ role });
  expect(await verifyRole(session(role))).toBe(role);
  expect(mockApiFetch).toHaveBeenCalledWith('/auth/me');
  expect(mockSignOut).not.toHaveBeenCalled();
});

test.each([['guardian'], [null]])('role %s is signed out', async (role) => {
  mockApiFetch.mockResolvedValue({ role });
  expect(await verifyRole(session('admin'))).toBe('out');
  expect(mockSignOut).toHaveBeenCalled();
});

test.each([[401], [403]])('API %i is signed out, whatever the token claims', async (status) => {
  mockApiFetch.mockRejectedValue(new ApiError(status));
  expect(await verifyRole(session('admin'))).toBe('out');
  expect(mockSignOut).toHaveBeenCalled();
});

test('offline or a 5xx trusts the token claim, never assumes admin', async () => {
  mockApiFetch.mockRejectedValueOnce(new TypeError('Network request failed'));
  expect(await verifyRole(session('teacher'))).toBe('teacher');
  mockApiFetch.mockRejectedValueOnce(new ApiError(502));
  expect(await verifyRole(session('admin'))).toBe('admin');
  expect(mockSignOut).not.toHaveBeenCalled();
});

test('offline with a guardian or no claim is signed out', async () => {
  mockApiFetch.mockRejectedValue(new TypeError('Network request failed'));
  expect(await verifyRole(session('guardian'))).toBe('out');
  expect(await verifyRole({ access_token: 'not-a-jwt' } as Session)).toBe('out');
  expect(mockSignOut).toHaveBeenCalledTimes(2);
});
