import { supabase } from '@/lib/supabase';
import { unregisterPush } from '@/push/registerPush';
import { signOutDevice, UNREGISTER_TIMEOUT_MS } from './sign-out';

jest.mock('@/push/registerPush', () => ({ unregisterPush: jest.fn() }));

const unregister = jest.mocked(unregisterPush);
const signOut = jest.mocked(supabase.auth.signOut);

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.useRealTimers());

test('removes the push token first (it needs the session), then signs out', async () => {
  const order: string[] = [];
  unregister.mockImplementationOnce(async () => {
    order.push('unregister');
  });
  signOut.mockImplementationOnce(async () => {
    order.push('signOut');
    return { error: null };
  });
  await signOutDevice();
  expect(order).toEqual(['unregister', 'signOut']);
});

test('a hung DELETE cannot trap the admin: sign-out goes ahead after the timeout', async () => {
  jest.useFakeTimers();
  unregister.mockImplementationOnce(() => new Promise<void>(() => undefined));
  const done = signOutDevice();
  await jest.advanceTimersByTimeAsync(UNREGISTER_TIMEOUT_MS);
  await done;
  expect(signOut).toHaveBeenCalledTimes(1);
});
