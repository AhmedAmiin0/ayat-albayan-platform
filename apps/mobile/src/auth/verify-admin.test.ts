import { ApiError } from '@/lib/api';
import { verifyAdmin } from './verify-admin';

const mockApiFetch = jest.fn();
const mockSignOut = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: () => mockSignOut() } } }));

beforeEach(() => jest.clearAllMocks());

test('admin stays in', async () => {
  mockApiFetch.mockResolvedValue({ role: 'admin' });
  expect(await verifyAdmin()).toBe('admin');
  expect(mockApiFetch).toHaveBeenCalledWith('/auth/me');
  expect(mockSignOut).not.toHaveBeenCalled();
});

test.each([['teacher'], [null]])('role %s is signed out', async (role) => {
  mockApiFetch.mockResolvedValue({ role });
  expect(await verifyAdmin()).toBe('out');
  expect(mockSignOut).toHaveBeenCalled();
});

test.each([[401], [403]])('API %i is signed out', async (status) => {
  mockApiFetch.mockRejectedValue(new ApiError(status));
  expect(await verifyAdmin()).toBe('out');
  expect(mockSignOut).toHaveBeenCalled();
});

test('offline or a 5xx keeps the admin on cached data', async () => {
  mockApiFetch.mockRejectedValueOnce(new TypeError('Network request failed'));
  expect(await verifyAdmin()).toBe('admin');
  mockApiFetch.mockRejectedValueOnce(new ApiError(502));
  expect(await verifyAdmin()).toBe('admin');
  expect(mockSignOut).not.toHaveBeenCalled();
});
