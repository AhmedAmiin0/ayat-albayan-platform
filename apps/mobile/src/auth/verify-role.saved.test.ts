import type { Session } from '@supabase/supabase-js';
import { onCacheRestored, queryClient } from '@/core/lib/query/query-client';
import { pathKey } from '@/core/lib/query/query-keys';
import { SAVED_ROLE_WAIT_MS, verifyRole } from './verify-role';

// A slow first /auth/me with the role the last run saved: the app opens on the saved one.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
const mockSignOut = jest.fn();
jest.mock('@/core/lib/http/supabase', () => ({ supabase: { auth: { signOut: () => mockSignOut() } } }));

const session = { access_token: 'h.e30.s' } as Session;
const hang = () => new Promise(() => undefined);

beforeAll(() => onCacheRestored());
beforeEach(() => {
  jest.useFakeTimers();
  queryClient.clear();
});
afterEach(() => jest.useRealTimers());

test('saved role and a slow network: open on it after the short wait', async () => {
  queryClient.setQueryData(pathKey('/auth/me'), { role: 'teacher' });
  mockApiFetch.mockImplementation(hang);
  const role = verifyRole(session);
  await jest.advanceTimersByTimeAsync(SAVED_ROLE_WAIT_MS);
  await expect(role).resolves.toBe('teacher');
});

test('a fast live answer wins over the saved one', async () => {
  queryClient.setQueryData(pathKey('/auth/me'), { role: 'teacher' });
  mockApiFetch.mockResolvedValue({ role: 'admin' });
  await expect(verifyRole(session)).resolves.toBe('admin');
});

test('nothing saved: it waits for the live answer', async () => {
  let answer: (me: unknown) => void = () => undefined;
  mockApiFetch.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
  const role = verifyRole(session);
  await jest.advanceTimersByTimeAsync(SAVED_ROLE_WAIT_MS * 10);
  answer({ role: 'sales' });
  await expect(role).resolves.toBe('sales');
});

test('a late answer that revokes the role still signs out', async () => {
  queryClient.setQueryData(pathKey('/auth/me'), { role: 'teacher' });
  let answer: (me: unknown) => void = () => undefined;
  mockApiFetch.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
  const role = verifyRole(session);
  await jest.advanceTimersByTimeAsync(SAVED_ROLE_WAIT_MS);
  await expect(role).resolves.toBe('teacher');
  answer({ role: 'guardian' });
  await jest.advanceTimersByTimeAsync(0);
  expect(mockSignOut).toHaveBeenCalled();
});
