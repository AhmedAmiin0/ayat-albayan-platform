import { connectivity } from '@/core/lib/connectivity/connectivity';
import { authFetch } from './auth-fetch';
import { READ_TIMEOUT_MS } from './read-deadline';

// Supabase's transport: a token refresh stuck on a dead connection settles at the deadline (every
// apiFetch and the realtime setAuth wait for it); a Storage upload keeps no deadline.

const mockFetch = jest.fn();
const never = () => new Promise<never>(() => undefined);
beforeEach(() => {
  jest.useFakeTimers();
  mockFetch.mockReset().mockImplementation(never);
  globalThis.fetch = mockFetch;
  jest.mocked(connectivity.reportFailure).mockClear();
});
afterEach(() => jest.useRealTimers());

test('a stuck token refresh (POST /auth/v1/token) rejects as no answer at the deadline', async () => {
  const refresh = authFetch('https://x.supabase.co/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
  });
  const settled = expect(refresh).rejects.toBeInstanceOf(TypeError);
  await jest.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
  await settled;
  expect(connectivity.reportFailure).toHaveBeenCalledTimes(1);
});

test('a Storage upload keeps no deadline', async () => {
  const onDone = jest.fn();
  void authFetch('https://x.supabase.co/storage/v1/object/receipts/a.jpg', { method: 'PUT' }).then(
    onDone,
    onDone,
  );
  await jest.advanceTimersByTimeAsync(READ_TIMEOUT_MS * 3);
  expect(onDone).not.toHaveBeenCalled();
});
